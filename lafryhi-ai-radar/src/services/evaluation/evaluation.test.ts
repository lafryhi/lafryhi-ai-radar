import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { executeEvaluationCli } from "../../../scripts/evaluate-gemini-migration";
import { parseGeminiRuntimeConfig } from "../gemini-runtime-config";
import { compareCase, evaluatePromotion } from "./comparator";
import { selectEvaluationCases } from "./dataset-loader";
import { validateEvaluationDataset } from "./dataset-validator";
import { EVALUATION_SIDE_EFFECT_CAPABILITIES, runEvaluation } from "./evaluation-engine";
import { calculateComparativeMetrics, calculateModelMetrics, percentile } from "./metrics";
import { CONFLICTING_REVIEW_ACTION_STATUS, evaluationInvariantViolations, mayEnterPublicFeed } from "./invariants";
import { csvReport, markdownReport, type EvaluationReport } from "./report-writer";
import { redactCaseSource, sanitizeError } from "./redaction";
import type { EvaluationCase, ModelCaseResult, StageEvaluationResult } from "./types";

const root = process.cwd();
const validStage: StageEvaluationResult = {
  requestedModel: "model",
  actualModel: "model",
  fallbackUsed: false,
  attempts: 1,
  durationMs: 100,
  requestSucceeded: true,
  jsonParseValid: true,
  schemaValid: true,
  applicationValid: true,
  exactQuoteValid: true,
  evidenceIdsValid: true,
  enumValid: true,
  insufficientEvidence: false,
  candidateCount: 1,
};
const modelResult = (model: string, overrides: Partial<ModelCaseResult> = {}): ModelCaseResult => ({
  model,
  signal: { ...validStage, requestedModel: model, actualModel: model },
  decision: { ...validStage, requestedModel: model, actualModel: model },
  pipelineCompleted: true,
  status: "READY",
  recommendation: "MONITOR",
  score: 70,
  confidence: 80,
  relevance: 60,
  evidenceCount: 2,
  outputText: "API synthetic result",
  ...overrides,
});

async function dataset() {
  return validateEvaluationDataset(JSON.parse(await readFile("eval/datasets/gemini-migration.json", "utf8")));
}

describe("evaluation dataset", () => {
  it("validates the versioned 15-case dataset and rejects invalid data", async () => {
    const loaded = await dataset();
    expect(loaded.cases).toHaveLength(15);
    expect(() => validateEvaluationDataset({ ...loaded, datasetVersion: "2.0" })).toThrow();
  });

  it("filters maximum cases and sampling deterministically", async () => {
    const cases = (await dataset()).cases;
    expect(selectEvaluationCases(cases, { sampleRate: 1, maxCases: 3 }).map((item) => item.id)).toEqual(cases.slice(0, 3).map((item) => item.id));
    expect(selectEvaluationCases(cases, { sampleRate: .5, maxCases: 0 })).toEqual(selectEvaluationCases(cases, { sampleRate: .5, maxCases: 0 }));
  });
});

describe("redaction and isolation", () => {
  it("redacts source bodies and secret-like error fragments", async () => {
    const testCase = (await dataset()).cases[0];
    expect(redactCaseSource({ source: testCase.source }, true).source).not.toHaveProperty("content");
    expect(sanitizeError(new Error("token=private-value failed"))).not.toContain("private-value");
  });

  it("declares no persistence, publication, cookie, session, or public response capability", () => {
    expect(Object.values(EVALUATION_SIDE_EFFECT_CAPABILITIES)).toEqual([false, false, false, false, false]);
  });

  it("preserves human-review feed and conflict invariants", () => {
    expect(mayEnterPublicFeed("pending")).toBe(false);
    expect(mayEnterPublicFeed("rejected")).toBe(false);
    expect(mayEnterPublicFeed("needs_changes")).toBe(false);
    expect(mayEnterPublicFeed("approved")).toBe(true);
    expect(CONFLICTING_REVIEW_ACTION_STATUS).toBe(409);
    const production = modelResult("production");
    expect(evaluationInvariantViolations(production, production, EVALUATION_SIDE_EFFECT_CAPABILITIES)).toEqual([]);
    expect(evaluationInvariantViolations(production, { ...production, recommendation: "ACT_NOW" }, EVALUATION_SIDE_EFFECT_CAPABILITIES))
      .toContain("candidate altered production decision");
  });

  it("isolates candidate failures and preserves baseline output", async () => {
    const loaded = await dataset();
    const oneCase = { ...loaded, cases: loaded.cases.slice(0, 1) };
    const config = parseGeminiRuntimeConfig({
      GOOGLE_CLOUD_PROJECT: "test",
      GEMINI_EVALUATION_ENABLED: "true",
      GEMINI_EVALUATION_CANDIDATE_MODEL: "candidate",
    });
    const runner = vi.fn(async (_case: EvaluationCase, model: string) => {
      if (model === "candidate") throw new Error("candidate failed");
      return modelResult(model);
    });
    const result = await runEvaluation(oneCase, config, runner);
    expect(result.caseResults[0].baseline.status).toBe("READY");
    expect(result.caseResults[0].candidate.status).toBe("FAILED");
    expect(result.caseResults[0]).not.toHaveProperty("source.content");
  });
});

describe("metrics and promotion", () => {
  it("calculates percentiles, rates, agreement, and drift", async () => {
    expect(percentile([1, 2, 3, 100], 95)).toBe(100);
    const testCase = (await dataset()).cases[0];
    const comparison = compareCase(testCase, modelResult("baseline"), modelResult("candidate", { score: 75, confidence: 70, evidenceCount: 3 }));
    const metrics = calculateComparativeMetrics([comparison]);
    expect(metrics).toMatchObject({ statusAgreementRate: 1, meanScoreDrift: 5, meanConfidenceDrift: 10, meanEvidenceCountDrift: 1 });
    expect(calculateModelMetrics([comparison.candidate], [false]).pipelineCompletionRate).toBe(1);
  });

  it("returns pass, warning, fail, and critical promotion outcomes", () => {
    const good = calculateModelMetrics([modelResult("good")], [false]);
    expect(evaluatePromotion(good, good, {
      statusAgreementRate: 1, recommendationAgreementRate: 1, meanScoreDrift: 0, meanConfidenceDrift: 0,
      meanRelevanceDrift: 0, meanEvidenceCountDrift: 0, insufficientEvidenceAgreementRate: 1,
      requiredKeywordComplianceRate: 1, forbiddenKeywordViolationRate: 0, unsupportedClaimRate: 0, quotationMismatchRate: 0,
    }, []).recommendation).toBe("ELIGIBLE_FOR_CANARY");
    expect(evaluatePromotion(good, { ...good, p95LatencyMs: good.p95LatencyMs * 2 }, {
      statusAgreementRate: .8, recommendationAgreementRate: 1, meanScoreDrift: 0, meanConfidenceDrift: 0,
      meanRelevanceDrift: 0, meanEvidenceCountDrift: 0, insufficientEvidenceAgreementRate: 1,
      requiredKeywordComplianceRate: 1, forbiddenKeywordViolationRate: 0, unsupportedClaimRate: 0, quotationMismatchRate: 0,
    }, []).recommendation).toBe("ELIGIBLE_FOR_MORE_TESTING");
    expect(evaluatePromotion(good, { ...good, pipelineCompletionRate: 0 }, {
      statusAgreementRate: 1, recommendationAgreementRate: 1, meanScoreDrift: 0, meanConfidenceDrift: 0,
      meanRelevanceDrift: 0, meanEvidenceCountDrift: 0, insufficientEvidenceAgreementRate: 1,
      requiredKeywordComplianceRate: 1, forbiddenKeywordViolationRate: 0, unsupportedClaimRate: 0, quotationMismatchRate: 0,
    }, []).recommendation).toBe("NOT_ELIGIBLE");
    expect(evaluatePromotion(good, good, {
      statusAgreementRate: 1, recommendationAgreementRate: 1, meanScoreDrift: 0, meanConfidenceDrift: 0,
      meanRelevanceDrift: 0, meanEvidenceCountDrift: 0, insufficientEvidenceAgreementRate: 1,
      requiredKeywordComplianceRate: 1, forbiddenKeywordViolationRate: 0, unsupportedClaimRate: 0, quotationMismatchRate: 0,
    }, ["pending published"]).recommendation).toBe("NOT_ELIGIBLE");
  });
});

describe("reports and CLI guards", () => {
  const report: EvaluationReport = {
    evaluationId: "eval_aaaaaaaaaaaaaaaaaaaaaaaa",
    evaluationContractVersion: "gemini-migration-evaluation-v2.6",
    reportContractVersion: "gemini-migration-report-v1.1",
    releaseManifestReference: "release/release-manifest.json",
    gitRevision: "a".repeat(40),
    policyVersion: "editorial-policy-v1.1",
    constitutionVersion: "editorial-policy-v1.1",
    datasetVersion: "1.0",
    editorialContextVersion: "editorial-context-v1.1",
    startedAt: "2026-07-30T00:00:00Z",
    completedAt: "2026-07-30T00:00:01Z",
    durationMs: 1000,
    integrityClassification: "VALID",
    qualityMetricsAdmissibility: "ADMISSIBLE",
    timestamp: "2026-07-30T00:00:01Z", sdkVersion: "2.13.0",
    productionModel: "gemini-2.5-flash", candidateModel: "candidate", location: "us-central1", caseCount: 1,
    candidateLifecycleStage: "unknown", lifecycleNotice: "operator-supplied", runLabel: "",
    modelConfiguration: { productionModel: "gemini-2.5-flash", fallbackModel: "gemini-2.5-flash", candidateModel: "candidate", candidateUse: "EVALUATION_ONLY" },
    safetyConfiguration: { trafficPercentage: 0, publicationEnabled: false, firestoreWritesEnabled: false, cloudRunWritesEnabled: false, rawOutputsEnabled: false, inputsRedacted: true },
    requestBudget: { maximumRequests: 4, maximumEstimatedInputTokens: 1000, maximumEstimatedOutputTokens: 5000 },
    actualRequestTotals: { requests: 2, retries: 0 },
    traceabilityMetadata: { complete: true, evaluationId: "eval_aaaaaaaaaaaaaaaaaaaaaaaa", caseCount: 1 },
    configuration: {}, baselineMetrics: {}, candidateMetrics: {}, comparativeMetrics: {},
    promotion: { recommendation: "NOT_ELIGIBLE", criticalInvariantViolations: [], checks: [] },
    failedCases: [], warningCases: [], missingMetadata: [], recommendation: "NOT_ELIGIBLE",
    evaluationIntegrity: "VALID", evaluationIntegrityReasons: [],
    caseResults: [{ caseId: "one", baseline: { status: "READY", model: "baseline" }, candidate: { status: "FAILED", model: "candidate" } }],
  };

  it("generates JSON-compatible, Markdown, and CSV report representations", () => {
    expect(JSON.parse(JSON.stringify(report)).datasetVersion).toBe("1.0");
    expect(markdownReport(report)).toContain("NOT_ELIGIBLE");
    expect(csvReport(report)).toContain("caseId");
  });

  it("validates and dry-runs without model calls, and guards real runs", async () => {
    await expect(executeEvaluationCli("validate", {}, root)).resolves.toMatchObject({ caseCount: 15, modelCalls: 0 });
    await expect(executeEvaluationCli("dry-run", {}, root)).resolves.toMatchObject({ modelCalls: 0 });
    await expect(executeEvaluationCli("run", { GOOGLE_CLOUD_PROJECT: "test" }, root)).rejects.toThrow("must be true");
  });
});
