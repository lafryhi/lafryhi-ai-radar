import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EDITORIAL_POLICY_CONSTITUTION, evaluateEditorialPolicyFacts } from "../src/services/editorial-policy-engine";
import { DEFAULT_FORBIDDEN_TERM_SETTINGS, detectForbiddenTermsInFields } from "../src/domain/forbidden-term-detector";
import { validateEvaluationDataset } from "../src/services/evaluation/dataset-validator";
import { readEvaluationReport } from "../src/services/evaluation/report-writer";
import { getEvaluationEditorialPolicyContext, validateEvaluationEditorialPolicyContexts } from "../src/services/evaluation/editorial-context";

interface SavedModelResult {
  status: "READY" | "INSUFFICIENT_EVIDENCE" | "FAILED";
  recommendation?: string;
  score?: number;
  confidence?: number;
  relevance?: number;
  evidenceCount: number;
}

interface SavedCaseResult {
  caseId: string;
  baseline: SavedModelResult;
  candidate: SavedModelResult;
  expectationChecks: { forbiddenKeywords: boolean };
}

export async function replayEditorialPolicy(
  reportPath: string,
  repositoryRoot = process.cwd(),
  now: () => Date = () => new Date(),
) {
  const report = await readEvaluationReport(resolve(repositoryRoot, reportPath));
  const dataset = validateEvaluationDataset(JSON.parse(
    await readFile(resolve(repositoryRoot, "eval/datasets/gemini-migration.json"), "utf8"),
  ));
  const casesById = new Map(dataset.cases.map((item) => [item.id, item]));
  validateEvaluationEditorialPolicyContexts(dataset.cases.map((item) => item.id));
  const results = (report.caseResults as SavedCaseResult[]).map((saved) => {
    const testCase = casesById.get(saved.caseId);
    if (!testCase) throw new Error(`Saved report contains unknown case ${saved.caseId}.`);
    const context = {
      itemId: saved.caseId,
      allowedPositions: testCase.expectations.allowedDecisionValues,
      sourceTrust: testCase.tags.includes("official") ? "TRUSTED" as const : "VERIFIED" as const,
      trustedSourceCount: testCase.tags.includes("official") ? 1 : 0,
      hasSourceConflict: testCase.category === "contradictory" || testCase.tags.includes("conflict"),
      promotionalContent: testCase.tags.includes("promotion") || testCase.category === "low-impact",
      lowImpactContent: testCase.tags.includes("low-impact") || testCase.category === "low-impact",
      numericalOrDateSensitive: testCase.tags.includes("date") || testCase.tags.includes("numbers"),
      pendingVerification: !testCase.expectations.mustReturnInsufficientEvidence
        && (testCase.expectations.expectedStatus === "pending" || testCase.tags.includes("pending")),
      humanReviewState: "PENDING" as const,
      configuredForbiddenTerms: testCase.expectations.forbiddenKeywords,
      preDetectedForbiddenTerms: [] as string[],
      scoreDrift: saved.baseline.score !== undefined && saved.candidate.score !== undefined
        ? Math.abs(saved.baseline.score - saved.candidate.score)
        : undefined,
      confidenceDrift: saved.baseline.confidence !== undefined && saved.candidate.confidence !== undefined
        ? Math.abs(saved.baseline.confidence - saved.candidate.confidence)
        : undefined,
      ...getEvaluationEditorialPolicyContext(saved.caseId),
    };
    const evaluate = (model: SavedModelResult, detectedTerms: string[] = []) => {
      const adjudication = detectForbiddenTermsInFields(
        { retainedDetectionEvidence: detectedTerms.join(" ") },
        EDITORIAL_POLICY_CONSTITUTION.forbiddenTerms,
        EDITORIAL_POLICY_CONSTITUTION.forbiddenTermSettings ?? DEFAULT_FORBIDDEN_TERM_SETTINGS,
      );
      return evaluateEditorialPolicyFacts({
      originalPosition: model.status === "READY"
        ? model.recommendation as "ACT_NOW" | "RUN_EXPERIMENT" | "MONITOR" | "DEFER" | "IGNORE" | "AVOID"
        : "INSUFFICIENT_EVIDENCE",
      evidenceCount: model.evidenceCount,
      evidenceIds: [],
      signalImportance: model.relevance ?? 0,
      confidence: model.confidence ?? 0,
      decisionText: "",
      context: { ...context, preDetectedForbiddenTerms: [] },
    }, { now, forbiddenTermAdjudication: adjudication });
    };
    const retainedDetectedTerms = saved.expectationChecks.forbiddenKeywords
      ? []
      : testCase.expectations.forbiddenKeywords.filter((term) =>
          EDITORIAL_POLICY_CONSTITUTION.forbiddenTerms.includes(term));
    return {
      caseId: saved.caseId,
      baseline: evaluate(saved.baseline),
      candidate: evaluate(saved.candidate, retainedDetectedTerms),
    };
  });
  const rate = (values: boolean[]) => values.length ? values.filter(Boolean).length / values.length : 0;
  const rank: Record<string, number> = { AVOID: 0, IGNORE: 1, DEFER: 2, MONITOR: 3, RUN_EXPERIMENT: 4, ACT_NOW: 5 };
  const acceptable = (caseId: string, position: string) => {
    const testCase = casesById.get(caseId)!;
    return position === "INSUFFICIENT_EVIDENCE"
      ? testCase.expectations.mustReturnInsufficientEvidence
      : testCase.expectations.allowedDecisionValues.includes(position as never);
  };
  const policies = results.map((item) => item.candidate);
  const rawAcceptable = results.map((item) => acceptable(item.caseId, item.candidate.originalPosition));
  const adjustedAcceptable = results.map((item) => acceptable(item.caseId, item.candidate.effectivePosition));
  const rawOverEscalations = results.filter((item) =>
    rank[item.candidate.originalPosition] > rank[item.baseline.originalPosition]);
  const excessiveConservatism = results.filter((item) =>
    item.candidate.originalPosition === "INSUFFICIENT_EVIDENCE"
    && item.baseline.originalPosition !== "INSUFFICIENT_EVIDENCE"
    && !casesById.get(item.caseId)!.expectations.mustReturnInsufficientEvidence);
  const outOfPolicy = results.filter((item) => !acceptable(item.caseId, item.candidate.originalPosition));
  const summary = {
    rawRecommendationAgreementRate: rate(results.map((item) =>
      item.baseline.originalPosition === item.candidate.originalPosition)),
    calibratedPolicyAdjustedAgreementRate: rate(results.map((item) =>
      item.baseline.effectivePosition === item.candidate.effectivePosition)),
    effectivePositionOverrideRate: rate(policies.map((policy) =>
      policy.effectivePosition !== policy.originalPosition)),
    effectivePositionDowngradeRate: rate(policies.map((policy) =>
      policy.originalPosition !== "INSUFFICIENT_EVIDENCE"
      && policy.effectivePosition !== "INSUFFICIENT_EVIDENCE"
      && rank[policy.effectivePosition] < rank[policy.originalPosition])),
    effectivePositionUpgradeRate: rate(policies.map((policy) =>
      policy.originalPosition !== "INSUFFICIENT_EVIDENCE"
      && policy.effectivePosition !== "INSUFFICIENT_EVIDENCE"
      && rank[policy.effectivePosition] > rank[policy.originalPosition])),
    actionDowngradeRate: rate(policies.map((policy) => policy.action === "DOWNGRADE")),
    additionalPolicyReviewRate: rate(policies.map((policy) => policy.additionalPolicyReviewRequired)),
    normalApplicationReviewRate: rate(policies.map((policy) => policy.normalApplicationReviewRequired)),
    blockRate: rate(policies.map((policy) => policy.action === "BLOCK")),
    overEscalationCorrectionRate: rate(rawOverEscalations.map((item) =>
      item.candidate.effectivePosition !== item.candidate.originalPosition)),
    excessiveConservatismCorrectionRate: rate(excessiveConservatism.map((item) =>
      item.candidate.effectivePosition !== "INSUFFICIENT_EVIDENCE")),
    outOfPolicyCorrectionRate: rate(outOfPolicy.map((item) =>
      acceptable(item.caseId, item.candidate.effectivePosition))),
    falsePositiveCount: rawAcceptable.filter((wasAcceptable, index) => wasAcceptable && !adjustedAcceptable[index]).length,
    falseNegativeCount: rawAcceptable.filter((wasAcceptable, index) => !wasAcceptable && !adjustedAcceptable[index]).length,
  };
  return {
    policyVersion: results[0]?.candidate.policyVersion,
    sourceReport: reportPath,
    modelCalls: 0,
    caseCount: results.length,
    summary,
    results,
  };
}

if (process.argv[1]?.endsWith("replay-editorial-policy.ts")) {
  const reportPath = process.argv[2];
  if (!reportPath) throw new Error("Usage: npm run eval:policy:replay -- <saved-report.json>");
  replayEditorialPolicy(reportPath).then((result) => console.log(JSON.stringify(result, null, 2)));
}
