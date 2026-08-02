import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { GeminiDecisionOutput, SignalIntelligence } from "@/domain/decision-intelligence";
import { parseGeminiRuntimeConfig } from "../gemini-runtime-config";
import {
  IntegratedAvailabilityGateError,
  integratedAvailabilityGateFailures,
  runEvaluation,
} from "./evaluation-engine";
import {
  createVertexRequestBudget,
  integratedShadowRequestPlan,
  VertexRequestBudgetExceeded,
} from "./live-safety";
import { validateEvaluationDataset } from "./dataset-validator";
import type { EvaluationCaseResult, ModelCaseResult, StageEvaluationResult } from "./types";

const stage = (model: string): StageEvaluationResult => ({
  requestedModel: model,
  actualModel: model,
  fallbackUsed: false,
  attempts: 1,
  durationMs: 1,
  requestSucceeded: true,
  transportSuccess: true,
  responseReceived: true,
  jsonParseValid: true,
  jsonParsed: true,
  schemaValid: true,
  applicationValid: true,
  exactQuoteValid: true,
  evidenceIdsValid: true,
  enumValid: true,
  insufficientEvidence: false,
  candidateCount: 1,
});

const signal = {
  status: "READY",
  category: "product_launch",
  whatHappened: [{ text: "A launch occurred.", evidenceIds: ["E1"] }],
  whatChanged: [{ text: "Availability changed.", evidenceIds: ["E1"] }],
  whyImportant: [{ text: "It may affect adoption.", evidenceIds: ["E1"] }],
  technologies: [],
  affectedIndustries: [],
  risks: [],
  opportunities: [],
  entities: [],
  evidence: [{ id: "E1", quote: "A launch occurred.", significance: "Official evidence." }],
  signalImportance: 60,
  evidenceConfidence: 80,
  warnings: [],
} as SignalIntelligence;

const decision = {
  status: "READY",
  recommendedPosition: "MONITOR",
  confidence: 80,
} as GeminiDecisionOutput;

function modelResult(model: string, pipelineCompleted = true): ModelCaseResult {
  return {
    model,
    signal: stage(model),
    decision: stage(model),
    pipelineCompleted,
    status: pipelineCompleted ? "READY" : "FAILED",
    recommendation: pipelineCompleted ? "MONITOR" : undefined,
    score: 60,
    confidence: 80,
    relevance: 60,
    evidenceCount: 1,
    outputText: JSON.stringify({ decision: "monitor" }),
    validatedSignal: signal,
    validatedDecision: decision,
  };
}

async function twoCaseDataset() {
  const parsed = validateEvaluationDataset(JSON.parse(await readFile("eval/datasets/gemini-migration.json", "utf8")));
  return { ...parsed, cases: parsed.cases.slice(0, 2) };
}

const config = parseGeminiRuntimeConfig({
  GOOGLE_CLOUD_PROJECT: "test",
  GEMINI_PRIMARY_MODEL: "gemini-2.5-flash",
  GEMINI_FALLBACK_MODEL: "gemini-2.5-flash",
  GEMINI_EVALUATION_ENABLED: "true",
  GEMINI_EVALUATION_CANDIDATE_MODEL: "candidate",
  GEMINI_EVALUATION_ALLOWED_MODELS: "candidate",
  GEMINI_EVALUATION_MAX_REQUESTS: "60",
  GEMINI_EVALUATION_REDACT_INPUTS: "true",
});

describe("budget-constrained integrated shadow gate", () => {
  it("accounts for exactly 60 requests with no duplicate smoke calls", () => {
    expect(integratedShadowRequestPlan(15)).toMatchObject({
      caseCount: 15,
      logicalModelCaseExecutions: 30,
      integratedGateRequests: 4,
      continuationRequests: 56,
      duplicateSmokeRequests: 0,
      requests: 60,
      estimatedOutputTokens: 75_000,
    });
  });

  it("never permits a sixty-first Vertex attempt", () => {
    const budget = createVertexRequestBudget(60);
    for (let attempt = 0; attempt < 60; attempt += 1) budget.beforeRequest();
    expect(budget.used()).toBe(60);
    expect(budget.remaining()).toBe(0);
    expect(() => budget.beforeRequest()).toThrow(VertexRequestBudgetExceeded);
    expect(budget.used()).toBe(60);
  });

  it("requires every former smoke control on the integrated case", () => {
    const baseline = modelResult("baseline");
    const candidate = modelResult("candidate");
    const comparison = {
      caseId: "case",
      category: "official",
      language: "en",
      baseline,
      candidate: {
        ...candidate,
        editorialPolicy: { policyVersion: "editorial-policy-v1.1" },
      },
      expectationChecks: {
        requiredKeywords: true,
        forbiddenKeywords: true,
        insufficientEvidenceCorrect: true,
        unsupportedClaims: false,
        quotationMismatch: false,
        forbiddenTermDetectorAgreement: true,
      },
      invariantViolations: [],
    } as unknown as EvaluationCaseResult;
    expect(integratedAvailabilityGateFailures(comparison)).toEqual([]);
    comparison.candidate.signal.schemaValid = false;
    expect(integratedAvailabilityGateFailures(comparison)).toContain("candidate/signal: schema validation failed");
  });

  it("aborts after case one and never invokes later cases when the gate fails", async () => {
    const dataset = await twoCaseDataset();
    const runner = vi.fn(async (testCase: { id: string }, model: string) =>
      modelResult(model, !(testCase.id === dataset.cases[0].id && model === "candidate")));
    await expect(runEvaluation(dataset, config, runner, { integratedAvailabilityGate: true }))
      .rejects.toBeInstanceOf(IntegratedAvailabilityGateError);
    expect(runner).toHaveBeenCalledTimes(2);
    expect(runner.mock.calls.every(([testCase]) => testCase.id === dataset.cases[0].id)).toBe(true);
  });

  it("reuses the passing first case and continues without duplicate execution", async () => {
    const dataset = await twoCaseDataset();
    const runner = vi.fn(async (_testCase: { id: string }, model: string) => modelResult(model));
    const result = await runEvaluation(dataset, config, runner, { integratedAvailabilityGate: true });
    expect(runner).toHaveBeenCalledTimes(4);
    expect(result.caseResults).toHaveLength(2);
    expect(result.execution.integratedAvailabilityGate).toEqual({
      enabled: true,
      caseId: dataset.cases[0].id,
      passed: true,
      requestAllocation: 4,
    });
  });
});
