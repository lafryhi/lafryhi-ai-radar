import type { ComparativeMetrics, EvaluationCaseResult, ModelCaseResult, ModelMetrics, StageEvaluationResult } from "./types";

export function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil((percentileValue / 100) * sorted.length) - 1];
}

const rate = (values: boolean[]) => values.length ? values.filter(Boolean).length / values.length : 0;
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const stages = (results: ModelCaseResult[]) => results.flatMap((item) => item.decision ? [item.signal, item.decision] : [item.signal]);
const tokenMean = (items: StageEvaluationResult[], key: "inputTokens" | "outputTokens" | "totalTokens") => {
  const values = items.map((item) => item[key]).filter((value): value is number => value !== undefined);
  return values.length ? mean(values) : undefined;
};

export function calculateModelMetrics(results: ModelCaseResult[], expectedInsufficient: boolean[]): ModelMetrics {
  const allStages = stages(results);
  const latencies = allStages.map((stage) => stage.durationMs);
  return {
    transportSuccessRate: rate(allStages.map((stage) => Boolean(stage.transportSuccess))),
    responseReceivedRate: rate(allStages.map((stage) => Boolean(stage.responseReceived))),
    requestSuccessRate: rate(allStages.map((stage) => stage.requestSucceeded)),
    jsonParseSuccessRate: rate(allStages.map((stage) => stage.jsonParseValid)),
    schemaValidRate: rate(allStages.map((stage) => stage.schemaValid)),
    applicationValidationRate: rate(allStages.map((stage) => stage.applicationValid)),
    exactEvidenceRate: rate(allStages.map((stage) => stage.exactQuoteValid)),
    evidenceIdComplianceRate: rate(allStages.map((stage) => stage.evidenceIdsValid)),
    enumComplianceRate: rate(allStages.map((stage) => stage.enumValid)),
    pipelineCompletionRate: rate(results.map((item) => item.pipelineCompleted)),
    insufficientEvidenceCorrectnessRate: rate(results.map((item, index) =>
      (item.status === "INSUFFICIENT_EVIDENCE") === expectedInsufficient[index])),
    meanLatencyMs: mean(latencies),
    medianLatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    averageAttempts: mean(allStages.map((stage) => stage.attempts)),
    fallbackRate: rate(allStages.map((stage) => stage.fallbackUsed)),
    timeoutRate: rate(allStages.map((stage) => stage.failureCategory === "timeout")),
    averageInputTokens: tokenMean(allStages, "inputTokens"),
    averageOutputTokens: tokenMean(allStages, "outputTokens"),
    averageTotalTokens: tokenMean(allStages, "totalTokens"),
    missingTokenMetadataRate: rate(allStages.map((stage) => stage.totalTokens === undefined)),
  };
}

const agreement = <T>(pairs: Array<[T, T]>) => rate(pairs.map(([left, right]) => left === right));
const drift = (pairs: Array<[number | undefined, number | undefined]>) =>
  mean(pairs.filter((pair): pair is [number, number] => pair[0] !== undefined && pair[1] !== undefined)
    .map(([left, right]) => Math.abs(left - right)));

export function calculateComparativeMetrics(results: EvaluationCaseResult[]): ComparativeMetrics {
  const policies = results.map((item) => item.candidate.editorialPolicy).filter((item) => item !== undefined);
  const positionRank: Record<string, number> = { AVOID: 0, IGNORE: 1, DEFER: 2, MONITOR: 3, RUN_EXPERIMENT: 4, ACT_NOW: 5 };
  const rankedChange = (policy: NonNullable<EvaluationCaseResult["candidate"]["editorialPolicy"]>) =>
    policy.originalPosition !== "INSUFFICIENT_EVIDENCE" && policy.effectivePosition !== "INSUFFICIENT_EVIDENCE"
      ? positionRank[policy.effectivePosition] - positionRank[policy.originalPosition]
      : 0;
  const rawOverEscalations = results.filter((item) => {
    return item.baseline.recommendation && item.candidate.recommendation
      && positionRank[item.candidate.recommendation] > positionRank[item.baseline.recommendation];
  });
  const excessiveConservatism = results.filter((item) =>
    item.baseline.status === "READY" && item.candidate.status === "INSUFFICIENT_EVIDENCE");
  const outOfPolicy = results.filter((item) => item.candidate.editorialPolicy
    && item.candidate.editorialPolicy.originalPosition !== "INSUFFICIENT_EVIDENCE"
    && item.policyExpectation
    && !item.policyExpectation.allowedPositions.includes(item.candidate.editorialPolicy.originalPosition));
  const adjustedAgreement = agreement(results.map((item) => [
    item.baseline.editorialPolicy?.effectivePosition ?? item.baseline.recommendation,
    item.candidate.editorialPolicy?.effectivePosition ?? item.candidate.recommendation,
  ]));
  const effectivePositionOverrideRate = rate(policies.map((policy) => policy.effectivePosition !== policy.originalPosition));
  const effectivePositionDowngradeRate = rate(policies.map((policy) => rankedChange(policy) < 0));
  const blockRate = rate(policies.map((policy) => policy.action === "BLOCK"));
  const requireHumanReviewRate = rate(policies.map((policy) => policy.additionalPolicyReviewRequired));
  return {
    statusAgreementRate: agreement(results.map((item) => [item.baseline.status, item.candidate.status])),
    recommendationAgreementRate: agreement(results.map((item) => [item.baseline.recommendation, item.candidate.recommendation])),
    rawStatusAgreementRate: agreement(results.map((item) => [item.baseline.status, item.candidate.status])),
    rawRecommendationAgreementRate: agreement(results.map((item) => [item.baseline.recommendation, item.candidate.recommendation])),
    policyAdjustedRecommendationAgreementRate: adjustedAgreement,
    effectivePositionOverrideRate,
    effectivePositionDowngradeRate,
    effectivePositionUpgradeRate: rate(policies.map((policy) => rankedChange(policy) > 0)),
    actionDowngradeRate: rate(policies.map((policy) => policy.action === "DOWNGRADE")),
    requireHumanReviewRate,
    normalApplicationReviewRate: rate(policies.map((policy) => policy.normalApplicationReviewRequired)),
    pendingPathConversionRate: rate(policies.map((policy) =>
      policy.originalPosition === "INSUFFICIENT_EVIDENCE"
      && (policy.effectivePosition === "DEFER" || policy.effectivePosition === "MONITOR"))),
    blockRate,
    policyOverrideRate: effectivePositionOverrideRate,
    policyDowngradeRate: effectivePositionDowngradeRate,
    policyBlockRate: blockRate,
    policyHumanReviewRate: requireHumanReviewRate,
    forbiddenTermDetectionRate: rate(policies.map((policy) => policy.forbiddenTermsDetected.length > 0)),
    overEscalationCorrectionRate: rate(rawOverEscalations.map((item) =>
      item.candidate.editorialPolicy?.effectivePosition !== item.candidate.editorialPolicy?.originalPosition)),
    excessiveConservatismCorrectionRate: rate(excessiveConservatism.map((item) =>
      item.candidate.editorialPolicy?.effectivePosition !== "INSUFFICIENT_EVIDENCE")),
    outOfPolicyRecommendationCorrectionRate: rate(outOfPolicy.map((item) =>
      item.candidate.editorialPolicy?.effectivePosition !== item.candidate.editorialPolicy?.originalPosition)),
    meanScoreDrift: drift(results.map((item) => [item.baseline.score, item.candidate.score])),
    meanConfidenceDrift: drift(results.map((item) => [item.baseline.confidence, item.candidate.confidence])),
    meanRelevanceDrift: drift(results.map((item) => [item.baseline.relevance, item.candidate.relevance])),
    meanEvidenceCountDrift: mean(results.map((item) => Math.abs(item.baseline.evidenceCount - item.candidate.evidenceCount))),
    insufficientEvidenceAgreementRate: agreement(results.map((item) => [
      item.baseline.status === "INSUFFICIENT_EVIDENCE",
      item.candidate.status === "INSUFFICIENT_EVIDENCE",
    ])),
    requiredKeywordComplianceRate: rate(results.map((item) => item.expectationChecks.requiredKeywords)),
    forbiddenKeywordViolationRate: rate(results.map((item) => !item.expectationChecks.forbiddenKeywords)),
    unsupportedClaimRate: rate(results.map((item) => item.expectationChecks.unsupportedClaims)),
    quotationMismatchRate: rate(results.map((item) => item.expectationChecks.quotationMismatch)),
  };
}
