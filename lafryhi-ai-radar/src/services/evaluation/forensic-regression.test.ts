import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { geminiAnalysisFixture } from "@/test/fixtures";
import { validateEvaluationSchemaVersion } from "./case-runner";
import { evaluatePromotion } from "./comparator";
import { validateEvaluationDataset } from "./dataset-validator";
import { assessEvaluationIntegrity } from "./integrity";
import { requiredKeywordDiagnostics } from "./keyword-matching";
import { calculateModelMetrics } from "./metrics";
import type { ComparativeMetrics, EvaluationCaseResult, ModelCaseResult, ModelMetrics, StageEvaluationResult } from "./types";

const stage = (overrides: Partial<StageEvaluationResult> = {}): StageEvaluationResult => ({
  requestedModel: "model", actualModel: "model", fallbackUsed: false, attempts: 1, durationMs: 10,
  requestSucceeded: true, transportSuccess: true, responseReceived: true,
  jsonParseValid: true, jsonParsed: true, schemaValid: true, schemaVersionMatched: "signal-intelligence-v1",
  applicationValid: true, exactQuoteValid: true, evidenceIdsValid: true, enumValid: true,
  insufficientEvidence: false, candidateCount: 1, validationErrors: [],
  stageDurations: { requestMs: 8, validationMs: 2, totalMs: 10 }, promotionImpact: "NONE",
  ...overrides,
});
const model = (overrides: Partial<ModelCaseResult> = {}): ModelCaseResult => ({
  model: "model", signal: stage(), pipelineCompleted: true, status: "READY",
  recommendation: "MONITOR", score: 70, confidence: 70, relevance: 70, evidenceCount: 1,
  outputText: "Example API", ...overrides,
});
const comparison: ComparativeMetrics = {
  statusAgreementRate: 1, recommendationAgreementRate: 1, meanScoreDrift: 0, meanConfidenceDrift: 0,
  meanRelevanceDrift: 0, meanEvidenceCountDrift: 0, insufficientEvidenceAgreementRate: 1,
  requiredKeywordComplianceRate: 1, forbiddenKeywordViolationRate: 0, unsupportedClaimRate: 0, quotationMismatchRate: 0,
};
const goodMetrics: ModelMetrics = {
  transportSuccessRate: 1, responseReceivedRate: 1, requestSuccessRate: 1, jsonParseSuccessRate: 1,
  schemaValidRate: 1, applicationValidationRate: 1, exactEvidenceRate: 1, evidenceIdComplianceRate: 1,
  enumComplianceRate: 1, pipelineCompletionRate: 1, insufficientEvidenceCorrectnessRate: 1,
  meanLatencyMs: 10, medianLatencyMs: 10, p95LatencyMs: 10, averageAttempts: 1,
  fallbackRate: 0, timeoutRate: 0, missingTokenMetadataRate: 1,
};

async function smokeCase() {
  const dataset = validateEvaluationDataset(JSON.parse(await readFile("eval/datasets/gemini-migration.json", "utf8")));
  return { dataset, testCase: dataset.cases.find((item) => item.smokeTest)! };
}

describe("forensic evaluation regression", () => {
  it("separates request, response, parse, schema, application, and pipeline metrics", () => {
    const schemaFailure = model({
      signal: stage({ schemaValid: false, applicationValid: false, failedStage: "SCHEMA" }),
      pipelineCompleted: false, status: "FAILED",
    });
    const metrics = calculateModelMetrics([schemaFailure], [false]);
    expect(metrics).toMatchObject({
      transportSuccessRate: 1,
      responseReceivedRate: 1,
      requestSuccessRate: 1,
      jsonParseSuccessRate: 1,
      schemaValidRate: 0,
      applicationValidationRate: 0,
      pipelineCompletionRate: 0,
    });
  });

  it("preserves request and schema success when application validation fails", () => {
    const applicationFailure = model({
      signal: stage({ applicationValid: false, failedStage: "APPLICATION_VALIDATION" }),
      pipelineCompleted: false, status: "FAILED",
    });
    expect(calculateModelMetrics([applicationFailure], [false])).toMatchObject({
      requestSuccessRate: 1, schemaValidRate: 1, applicationValidationRate: 0, pipelineCompletionRate: 0,
    });
  });

  it("records stage 1 success independently when stage 2 fails", () => {
    const stageTwoFailure = model({
      signal: stage(),
      decision: stage({ requestSucceeded: false, transportSuccess: false, responseReceived: false, jsonParseValid: false, jsonParsed: false, schemaValid: false, applicationValid: false, failedStage: "REQUEST" }),
      pipelineCompleted: false,
      status: "FAILED",
    });
    const metrics = calculateModelMetrics([stageTwoFailure], [false]);
    expect(metrics.requestSuccessRate).toBe(.5);
    expect(metrics.pipelineCompletionRate).toBe(0);
  });

  it("marks shared harness defects inconclusive rather than model-ineligible", async () => {
    const { dataset, testCase } = await smokeCase();
    const failed = model({ signal: stage({ failedStage: "HARNESS" }), pipelineCompleted: false, status: "FAILED" });
    const result: EvaluationCaseResult = {
      caseId: testCase.id, category: testCase.category, language: testCase.language,
      baseline: failed, candidate: { ...failed, model: "candidate" },
      expectationChecks: { requiredKeywords: false, forbiddenKeywords: true, insufficientEvidenceCorrect: true, unsupportedClaims: false, quotationMismatch: false },
      invariantViolations: [],
    };
    const integrity = assessEvaluationIntegrity(dataset.cases.slice(0, 1), [result]);
    expect(integrity.integrity).toBe("INVALID_HARNESS");
    expect(evaluatePromotion(goodMetrics, goodMetrics, comparison, [], "ga", integrity.integrity, integrity.reasons).recommendation).toBe("INCONCLUSIVE");
  });

  it("detects invalid dataset expectations", async () => {
    const { testCase } = await smokeCase();
    const invalid = { ...testCase, expectations: { ...testCase.expectations, requiredKeywords: ["absent-phrase"] } };
    const result: EvaluationCaseResult = {
      caseId: invalid.id, category: invalid.category, language: invalid.language,
      baseline: model(), candidate: model({ model: "candidate" }),
      expectationChecks: { requiredKeywords: false, forbiddenKeywords: true, insufficientEvidenceCorrect: true, unsupportedClaims: false, quotationMismatch: false },
      invariantViolations: [],
    };
    expect(assessEvaluationIntegrity([invalid], [result]).integrity).toBe("INVALID_DATASET_EXPECTATION");
  });

  it("supports normalized keyword matching and explicit alternatives", () => {
    expect(requiredKeywordDiagnostics("The APIs are documented.", [], [["API", "APIs"]])).toEqual({ valid: true, missing: [] });
    expect(requiredKeywordDiagnostics("L’exportation structurée est prête.", ["exportation structuree"], [])).toEqual({ valid: true, missing: [] });
  });

  it("reports explicit current and legacy schema versions", () => {
    expect(validateEvaluationSchemaVersion(geminiAnalysisFixture, "signal")).toMatchObject({ valid: true, version: "legacy-analysis-v1" });
    expect(validateEvaluationSchemaVersion({
      status: "INSUFFICIENT_EVIDENCE",
      reason: "The source lacks sufficient verified details.",
      missingEvidence: ["A named capability"],
      evidence: [],
    }, "signal")).toMatchObject({ valid: true, version: "signal-intelligence-v1" });
  });

  it("uses NOT_ELIGIBLE only for a genuine model-quality failure in a valid evaluation", () => {
    const poor = { ...goodMetrics, pipelineCompletionRate: .5 };
    expect(evaluatePromotion(goodMetrics, poor, comparison, [], "ga", "VALID", []).recommendation).toBe("NOT_ELIGIBLE");
  });
});
