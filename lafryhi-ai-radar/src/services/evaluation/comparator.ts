import type { GeminiCandidateStage } from "../gemini-runtime-config";
import { EDITORIAL_POLICY_CONSTITUTION, evaluateEditorialPolicy } from "../editorial-policy-engine";
import { DEFAULT_FORBIDDEN_TERM_SETTINGS, detectForbiddenTermsInFields } from "@/domain/forbidden-term-detector";
import { requiredKeywordDiagnostics } from "./keyword-matching";
import { getEvaluationEditorialPolicyContext } from "./editorial-context";
import type { ComparativeMetrics, EvaluationCase, EvaluationCaseResult, ModelCaseResult, ModelMetrics, PromotionCheck, PromotionRecommendation, PromotionResult } from "./types";

export function compareCase(testCase: EvaluationCase, baseline: ModelCaseResult, candidate: ModelCaseResult): EvaluationCaseResult {
  const output = candidate.outputText.toLocaleLowerCase();
  const keywords = requiredKeywordDiagnostics(
    output,
    testCase.expectations.requiredKeywords,
    testCase.expectations.requiredKeywordAlternatives,
  );
  const calibratedContext = testCase.editorialPolicyContext ?? getEvaluationEditorialPolicyContext(testCase.id);
  const adjudicate = (result: ModelCaseResult) => detectForbiddenTermsInFields(
    { modelOutput: result.outputText },
    EDITORIAL_POLICY_CONSTITUTION.forbiddenTerms,
    EDITORIAL_POLICY_CONSTITUTION.forbiddenTermSettings ?? DEFAULT_FORBIDDEN_TERM_SETTINGS,
  );
  const policyContext = (result: ModelCaseResult, counterpart?: ModelCaseResult) => ({
    itemId: testCase.id,
    allowedPositions: testCase.expectations.allowedDecisionValues,
    sourceTrust: (testCase.tags.includes("official") ? "TRUSTED" : "VERIFIED") as "TRUSTED" | "VERIFIED",
    trustedSourceCount: testCase.tags.includes("official") ? 1 : 0,
    hasSourceConflict: testCase.category === "contradictory" || testCase.tags.includes("conflict"),
    promotionalContent: testCase.tags.includes("promotion") || testCase.category === "low-impact",
    lowImpactContent: testCase.category === "low-impact" || testCase.tags.includes("low-impact"),
    numericalOrDateSensitive: testCase.tags.includes("date") || testCase.tags.includes("numbers"),
    pendingVerification: !testCase.expectations.mustReturnInsufficientEvidence
      && (testCase.expectations.expectedStatus === "pending" || testCase.tags.includes("pending")),
    humanReviewState: "PENDING" as const,
    configuredForbiddenTerms: testCase.expectations.forbiddenKeywords,
    preDetectedForbiddenTerms: [],
    scoreDrift: counterpart?.score !== undefined && result.score !== undefined ? Math.abs(counterpart.score - result.score) : undefined,
    confidenceDrift: counterpart?.confidence !== undefined && result.confidence !== undefined
      ? Math.abs(counterpart.confidence - result.confidence)
      : undefined,
    ...calibratedContext,
  });
  const applyPolicy = (result: ModelCaseResult, counterpart?: ModelCaseResult) => {
    if (!result.validatedSignal) return result;
    const adjudication = adjudicate(result);
    const expectationResult = adjudication.detectionCount === 0;
    const editorialPolicy = evaluateEditorialPolicy({
      signal: result.validatedSignal,
      decision: result.validatedDecision,
      decisionText: result.outputText,
      context: policyContext(result, counterpart),
    }, { forbiddenTermAdjudication: adjudication });
    const policyResult = editorialPolicy.triggeredRuleIds.includes("EP-006");
    return {
      ...result,
      editorialPolicy,
      forbiddenTermAdjudication: {
        ...adjudication,
        expectationResult,
        policyResult,
        detectorAgreement: policyResult === !expectationResult,
      },
    };
  };
  const policyBaseline = applyPolicy(baseline);
  const policyCandidate = applyPolicy(candidate, baseline);
  return {
    caseId: testCase.id,
    category: testCase.category,
    language: testCase.language,
    source: testCase.source,
    baseline: policyBaseline,
    candidate: policyCandidate,
    policyExpectation: {
      allowedPositions: testCase.expectations.allowedDecisionValues,
    },
    expectationChecks: {
      requiredKeywords: keywords.valid,
      forbiddenKeywords: policyCandidate.forbiddenTermAdjudication?.expectationResult ?? true,
      insufficientEvidenceCorrect: (candidate.status === "INSUFFICIENT_EVIDENCE") === testCase.expectations.mustReturnInsufficientEvidence,
      unsupportedClaims: false,
      quotationMismatch: !candidate.signal.exactQuoteValid,
      missingRequiredKeywords: keywords.missing,
      forbiddenTermDetectorAgreement: policyCandidate.forbiddenTermAdjudication?.detectorAgreement ?? true,
    },
    invariantViolations: [],
  };
}

export function evaluatePromotion(
  baseline: ModelMetrics,
  candidate: ModelMetrics,
  comparative: ComparativeMetrics,
  criticalInvariantViolations: string[],
  candidateStage: GeminiCandidateStage = "ga",
  integrity: import("./types").EvaluationIntegrity = "VALID",
  integrityReasons: string[] = [],
): PromotionResult {
  const checks: PromotionCheck[] = [
    { name: "pipeline completion", severity: candidate.pipelineCompletionRate >= .98 ? "pass" : "fail", actual: candidate.pipelineCompletionRate, threshold: ">= 98%" },
    { name: "JSON parse", severity: candidate.jsonParseSuccessRate >= .99 ? "pass" : "fail", actual: candidate.jsonParseSuccessRate, threshold: ">= 99%" },
    { name: "schema validity", severity: candidate.schemaValidRate >= .99 ? "pass" : "fail", actual: candidate.schemaValidRate, threshold: ">= 99%" },
    { name: "exact evidence", severity: candidate.exactEvidenceRate >= .98 ? "pass" : "fail", actual: candidate.exactEvidenceRate, threshold: ">= 98%" },
    { name: "evidence IDs", severity: candidate.evidenceIdComplianceRate === 1 ? "pass" : "critical", actual: candidate.evidenceIdComplianceRate, threshold: "100%" },
    { name: "enums", severity: candidate.enumComplianceRate === 1 ? "pass" : "critical", actual: candidate.enumComplianceRate, threshold: "100%" },
    { name: "insufficient evidence", severity: candidate.insufficientEvidenceCorrectnessRate >= .95 ? "pass" : "fail", actual: candidate.insufficientEvidenceCorrectnessRate, threshold: ">= 95%" },
    { name: "status agreement", severity: comparative.statusAgreementRate >= .9 ? "pass" : "warning", actual: comparative.statusAgreementRate, threshold: ">= 90%" },
    { name: "p95 latency", severity: candidate.p95LatencyMs <= baseline.p95LatencyMs * 1.5 ? "pass" : "warning", actual: candidate.p95LatencyMs, threshold: "<= 1.5x baseline" },
    { name: "fallback rate", severity: candidate.fallbackRate <= baseline.fallbackRate + .02 ? "pass" : "warning", actual: candidate.fallbackRate, threshold: "<= baseline + 2pp" },
    { name: "timeout rate", severity: candidate.timeoutRate <= .01 ? "pass" : "fail", actual: candidate.timeoutRate, threshold: "<= 1%" },
  ];
  criticalInvariantViolations.forEach((name) => checks.push({ name, severity: "critical", actual: false, threshold: "must hold" }));
  const severity = checks.map((check) => check.severity);
  let recommendation: PromotionRecommendation | "INCONCLUSIVE" = severity.includes("critical") || severity.includes("fail")
    ? "NOT_ELIGIBLE"
    : severity.includes("warning") ? "ELIGIBLE_FOR_MORE_TESTING" : "ELIGIBLE_FOR_CANARY";
  if (candidateStage !== "ga" && recommendation === "ELIGIBLE_FOR_CANARY") {
    checks.push({ name: "operator-supplied lifecycle stage", severity: "warning", actual: false, threshold: "GA required for canary eligibility" });
    recommendation = "ELIGIBLE_FOR_MORE_TESTING";
  }
  if (integrity !== "VALID") recommendation = "INCONCLUSIVE";
  return { recommendation, checks, criticalInvariantViolations, integrity, integrityReasons };
}
