import type { GeminiRuntimeConfig } from "../gemini-runtime-config";

export interface PlannedEvaluationUsage {
  requests: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

export interface IntegratedShadowRequestPlan extends PlannedEvaluationUsage {
  caseCount: number;
  logicalModelCaseExecutions: number;
  integratedGateRequests: number;
  continuationRequests: number;
  duplicateSmokeRequests: 0;
}

export class VertexRequestBudgetExceeded extends Error {
  constructor(readonly maximumRequests: number) {
    super(`Vertex request ceiling of ${maximumRequests} has been reached.`);
    this.name = "VertexRequestBudgetExceeded";
  }
}

export function createVertexRequestBudget(maximumRequests: number) {
  let used = 0;
  return Object.freeze({
    beforeRequest() {
      if (used >= maximumRequests) throw new VertexRequestBudgetExceeded(maximumRequests);
      used += 1;
    },
    used: () => used,
    remaining: () => maximumRequests - used,
  });
}

export function integratedShadowRequestPlan(caseCount: number): IntegratedShadowRequestPlan {
  if (!Number.isInteger(caseCount) || caseCount < 1) throw new Error("Integrated shadow evaluation requires at least one case.");
  const requestsPerCase = 4;
  const integratedGateRequests = requestsPerCase;
  const continuationRequests = Math.max(0, caseCount - 1) * requestsPerCase;
  return {
    caseCount,
    logicalModelCaseExecutions: caseCount * 2,
    integratedGateRequests,
    continuationRequests,
    duplicateSmokeRequests: 0,
    requests: integratedGateRequests + continuationRequests,
    estimatedInputTokens: 0,
    estimatedOutputTokens: caseCount * requestsPerCase * 1_250,
  };
}

export function assertCandidateApprovedForEvaluation(config: GeminiRuntimeConfig) {
  const evaluation = config.evaluation;
  if (!evaluation.enabled) throw new Error("GEMINI_EVALUATION_ENABLED must be true.");
  if (!evaluation.candidateModel) throw new Error("GEMINI_EVALUATION_CANDIDATE_MODEL is required.");
  if (evaluation.candidateModel === config.primaryModel) throw new Error("The production model cannot be used as the candidate.");
  if (!evaluation.allowedModels.includes(evaluation.candidateModel)) {
    throw new Error("Candidate must exactly match GEMINI_EVALUATION_ALLOWED_MODELS. Evaluation allowlist approval is not production approval.");
  }
}

export function assertRealCallGuard(config: GeminiRuntimeConfig) {
  assertCandidateApprovedForEvaluation(config);
  if (!config.evaluation.allowRealCalls) throw new Error("GEMINI_EVALUATION_ALLOW_REAL_CALLS must be exactly true.");
  if (!config.evaluation.runLabel) throw new Error("GEMINI_EVALUATION_RUN_LABEL is required for every real run.");
}

export function assertUsageWithinLimits(config: GeminiRuntimeConfig, planned: PlannedEvaluationUsage) {
  if (planned.requests > config.evaluation.maxRequests) {
    throw new Error(`Planned requests ${planned.requests} exceed GEMINI_EVALUATION_MAX_REQUESTS.`);
  }
  if (planned.estimatedInputTokens > config.evaluation.maxEstimatedInputTokens) {
    throw new Error("Planned input tokens exceed GEMINI_EVALUATION_MAX_ESTIMATED_INPUT_TOKENS.");
  }
  if (planned.estimatedOutputTokens > config.evaluation.maxEstimatedOutputTokens) {
    throw new Error("Planned output tokens exceed GEMINI_EVALUATION_MAX_ESTIMATED_OUTPUT_TOKENS.");
  }
}

export function assertSmokeCaseCount(config: GeminiRuntimeConfig, selectedCount: number, maxCasesExplicit: boolean) {
  if (selectedCount > config.evaluation.hardCaseLimit) throw new Error("Smoke test exceeds GEMINI_EVALUATION_HARD_CASE_LIMIT.");
  const permitted = maxCasesExplicit ? config.evaluation.maxCases : 1;
  if (selectedCount > permitted) throw new Error("Smoke test selected more cases than explicitly requested.");
}
