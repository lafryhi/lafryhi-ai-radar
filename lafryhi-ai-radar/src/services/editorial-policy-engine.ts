import constitutionJson from "../../config/editorial-policy.v1.1.json";
import {
  EditorialPolicyConstitutionSchema,
  EditorialPolicyContextSchema,
  EditorialPolicyResultSchema,
  type EditorialPolicyAction,
  type EditorialPolicyConstitution,
  type EditorialPolicyContext,
  type EditorialPolicyFacts,
  type EditorialPolicyInput,
  type EditorialPolicyPosition,
  type EditorialPolicyResult,
} from "@/domain/editorial-policy";
import {
  DEFAULT_FORBIDDEN_TERM_SETTINGS,
  detectForbiddenTermsInFields,
  normalizeForbiddenText,
  type ForbiddenTermAdjudication,
} from "@/domain/forbidden-term-detector";

export const EDITORIAL_POLICY_CONSTITUTION = EditorialPolicyConstitutionSchema.parse(constitutionJson);

const positionRank: Record<Exclude<EditorialPolicyPosition, "INSUFFICIENT_EVIDENCE">, number> = {
  AVOID: 0,
  IGNORE: 1,
  DEFER: 2,
  MONITOR: 3,
  RUN_EXPERIMENT: 4,
  ACT_NOW: 5,
};

export function normalizeEditorialText(value: string) {
  return normalizeForbiddenText(value, EDITORIAL_POLICY_CONSTITUTION.forbiddenTermSettings ?? DEFAULT_FORBIDDEN_TERM_SETTINGS);
}

export function detectForbiddenTerms(text: string, configuredTerms: string[]) {
  return detectForbiddenTermsInFields(
    { decisionOutput: text },
    configuredTerms,
    EDITORIAL_POLICY_CONSTITUTION.forbiddenTermSettings ?? DEFAULT_FORBIDDEN_TERM_SETTINGS,
  ).normalizedDetectedTerms;
}

function supportedEvidenceIds(input: EditorialPolicyInput) {
  return input.signal.status === "READY" ? input.signal.evidence.map((item) => item.id) : input.signal.evidence.map((item) => item.id);
}

function originalPosition(input: EditorialPolicyInput): EditorialPolicyPosition {
  if (input.signal.status === "INSUFFICIENT_EVIDENCE" || input.decision?.status === "INSUFFICIENT_EVIDENCE") {
    return "INSUFFICIENT_EVIDENCE";
  }
  return input.decision?.recommendedPosition ?? "INSUFFICIENT_EVIDENCE";
}

function preferredReviewPosition(allowed: EditorialPolicyContext["allowedPositions"]) {
  return (["DEFER", "MONITOR", "IGNORE", "AVOID"] as const).find((position) => allowed.includes(position)) ?? "MONITOR";
}

function noUpgrade(original: EditorialPolicyPosition, proposed: EditorialPolicyPosition) {
  if (original === "INSUFFICIENT_EVIDENCE" || proposed === "INSUFFICIENT_EVIDENCE") return proposed;
  return positionRank[proposed] <= positionRank[original] ? proposed : original;
}

export function validateEditorialPolicyConstitution(value: unknown) {
  return EditorialPolicyConstitutionSchema.parse(value);
}

export function evaluateEditorialPolicy(
  rawInput: EditorialPolicyInput,
  options: { constitution?: EditorialPolicyConstitution; now?: () => Date; forbiddenTermAdjudication?: ForbiddenTermAdjudication } = {},
): EditorialPolicyResult {
  const original = originalPosition(rawInput);
  const evidenceIds = supportedEvidenceIds(rawInput);
  return evaluateEditorialPolicyFacts({
    originalPosition: original,
    evidenceCount: rawInput.signal.evidence.length,
    evidenceIds,
    signalImportance: rawInput.signal.status === "READY" ? rawInput.signal.signalImportance : 0,
    confidence: rawInput.decision?.status === "READY"
      ? rawInput.decision.confidence
      : rawInput.signal.status === "READY" ? rawInput.signal.evidenceConfidence : 0,
    decisionText: rawInput.decisionText,
    context: rawInput.context,
  }, options);
}

export function evaluateEditorialPolicyFacts(
  rawFacts: EditorialPolicyFacts,
  options: { constitution?: EditorialPolicyConstitution; now?: () => Date; forbiddenTermAdjudication?: ForbiddenTermAdjudication } = {},
): EditorialPolicyResult {
  const constitution = options.constitution ?? EDITORIAL_POLICY_CONSTITUTION;
  const context = EditorialPolicyContextSchema.parse(rawFacts.context);
  const facts = { ...rawFacts, context };
  const original = facts.originalPosition;
  let effective = original;
  const findings: Array<{
    ruleId: string;
    action: EditorialPolicyAction;
    message: string;
    affectedField: string;
    severity: "INFO" | "WARNING" | "BLOCKING";
    evidenceIds: string[];
    review: boolean;
  }> = [];
  const rule = (id: string) => constitution.rules.find((item) => item.id === id)!;
  const add = (
    id: string,
    affectedField: string,
    severity: "INFO" | "WARNING" | "BLOCKING",
    evidenceIds: string[],
    action = rule(id).action,
    review = action !== "ALLOW",
  ) => findings.push({ ruleId: id, action, message: rule(id).reasonTemplate, affectedField, severity, evidenceIds, review });
  const evidenceIds = facts.evidenceIds;
  const canonicalAdjudication = options.forbiddenTermAdjudication ?? detectForbiddenTermsInFields(
    { decisionOutput: facts.decisionText },
    constitution.forbiddenTerms,
    constitution.forbiddenTermSettings ?? DEFAULT_FORBIDDEN_TERM_SETTINGS,
  );
  const forbiddenTerms = [...new Set([
    ...canonicalAdjudication.normalizedDetectedTerms,
    ...context.preDetectedForbiddenTerms.map(normalizeEditorialText),
  ])].filter(Boolean);
  const conflictPresent = context.hasSourceConflict || context.uncertaintyState === "SOURCE_CONFLICT";
  const pendingPresent = context.pendingVerification || [
    "PENDING_VERIFICATION",
    "EDITORIAL_DEFER",
    "HUMAN_REVIEW_ONLY",
  ].includes(context.uncertaintyState);
  const insufficientEvidenceMisuse = context.evidenceState === "SUFFICIENT" && [
    "SOURCE_CONFLICT",
    "PENDING_VERIFICATION",
    "EDITORIAL_DEFER",
    "POLICY_UNCERTAINTY",
    "HUMAN_REVIEW_ONLY",
  ].includes(context.uncertaintyState);
  const strongActNow = constitution.strongActNow ?? {
    allowedSourceAuthority: ["AUTHORITATIVE", "TRUSTED"] as const,
    requiredMaterialImpact: "HIGH" as const,
    requireQualifiedConfidence: true,
  };

  if (original === "INSUFFICIENT_EVIDENCE" && insufficientEvidenceMisuse) {
    effective = preferredReviewPosition(context.allowedPositions);
    add("EP-007", "status", "WARNING", evidenceIds);
  }
  if (forbiddenTerms.length) add("EP-006", "decisionText", "BLOCKING", evidenceIds);
  if (conflictPresent) {
    if (effective === "ACT_NOW" || effective === "RUN_EXPERIMENT" || effective === "INSUFFICIENT_EVIDENCE") {
      effective = preferredReviewPosition(context.allowedPositions);
    }
    add("EP-003", "sourceConflict", "WARNING", evidenceIds);
  }
  if (pendingPresent) {
    if (effective === "ACT_NOW" || effective === "RUN_EXPERIMENT" || effective === "INSUFFICIENT_EVIDENCE") {
      effective = preferredReviewPosition(context.allowedPositions);
    }
    add("EP-004", "verificationState", "WARNING", evidenceIds);
  }
  if (original === "ACT_NOW" && context.numericalOrDateSensitive) {
    const numericalThresholdPassed = facts.evidenceCount >= constitution.thresholds.actNowMinimumEvidence
      && context.evidenceState === "SUFFICIENT"
      && strongActNow.allowedSourceAuthority.some((authority) => authority === context.sourceAuthority)
      && context.materialImpact === strongActNow.requiredMaterialImpact
      && (!strongActNow.requireQualifiedConfidence || context.confidenceQualified)
      && context.numericalClaimsVerified
      && !conflictPresent
      && !pendingPresent
      && !context.promotionalContent;
    if (!numericalThresholdPassed) {
      effective = noUpgrade(original, context.allowedPositions.includes("MONITOR") ? "MONITOR" : preferredReviewPosition(context.allowedPositions));
      add("EP-005", "recommendedPosition", "WARNING", evidenceIds);
    }
  }
  if (original === "ACT_NOW") {
    const actNowPassed = facts.evidenceCount >= constitution.thresholds.actNowMinimumEvidence
      && context.evidenceState === "SUFFICIENT"
      && strongActNow.allowedSourceAuthority.some((authority) => authority === context.sourceAuthority)
      && context.materialImpact === strongActNow.requiredMaterialImpact
      && (!strongActNow.requireQualifiedConfidence || context.confidenceQualified)
      && context.allowedPositions.includes("ACT_NOW")
      && !conflictPresent
      && !context.promotionalContent
      && !pendingPresent;
    if (!actNowPassed) {
      effective = noUpgrade(original, context.allowedPositions.includes("MONITOR") ? "MONITOR" : preferredReviewPosition(context.allowedPositions));
      add("EP-001", "recommendedPosition", "WARNING", evidenceIds);
    }
  }
  if (context.promotionalContent || context.lowImpactContent) {
    const maximum = context.allowedPositions.length === 1 && context.allowedPositions[0] === "IGNORE" ? "IGNORE" : "MONITOR";
    if (effective !== "INSUFFICIENT_EVIDENCE" && positionRank[effective] > positionRank[maximum]) {
      effective = maximum;
      add("EP-002", "recommendedPosition", "BLOCKING", evidenceIds, "DOWNGRADE");
    } else if (effective === "MONITOR" && maximum === "IGNORE") {
      effective = "IGNORE";
      add("EP-002", "recommendedPosition", "BLOCKING", evidenceIds, "DOWNGRADE");
    }
  }
  if (effective !== "INSUFFICIENT_EVIDENCE" && context.allowedPositions.length && !context.allowedPositions.includes(effective)) {
    const effectiveRank = positionRank[effective];
    const allowed = context.allowedPositions
      .filter((position) => positionRank[position] <= effectiveRank)
      .sort((left, right) => positionRank[right] - positionRank[left])[0] ?? context.allowedPositions[0];
    if (positionRank[allowed] <= effectiveRank) effective = allowed;
  }

  const materialDrift = (context.scoreDrift ?? 0) >= constitution.thresholds.materialScoreDrift
    || (context.confidenceDrift ?? 0) >= constitution.thresholds.materialConfidenceDrift;
  const outsideAllowed = original !== "INSUFFICIENT_EVIDENCE"
    && context.allowedPositions.length > 0
    && !context.allowedPositions.includes(original);
  const reviewTriggers = outsideAllowed || conflictPresent || pendingPresent
    || forbiddenTerms.length > 0 || original === "ACT_NOW" && effective !== original
    || original === "INSUFFICIENT_EVIDENCE" && effective !== original
    || materialDrift || context.promotionalContent && effective !== original;
  if (reviewTriggers) add("EP-008", "humanReviewState", "WARNING", evidenceIds);

  const actionRank = new Map(constitution.actionPriority.map((action, index) => [action, index]));
  const action = findings.reduce<EditorialPolicyAction>(
    (selected, finding) => (actionRank.get(finding.action)! > actionRank.get(selected)! ? finding.action : selected),
    effective === original ? "ALLOW" : "DOWNGRADE",
  );
  const additionalPolicyReviewRequired = action !== "ALLOW" || findings.some((finding) => finding.review);
  const policyScore = Math.max(0, 100 - findings.reduce((score, finding) =>
    score + (finding.severity === "BLOCKING" ? 30 : finding.severity === "WARNING" ? 15 : 5), 0));
  const ordered = findings.sort((left, right) => rule(left.ruleId).priority - rule(right.ruleId).priority);
  return EditorialPolicyResultSchema.parse({
    policyVersion: constitution.policyVersion,
    originalPosition: original,
    effectivePosition: effective,
    action,
    reasons: ordered.map((finding) => ({
      ruleId: finding.ruleId,
      message: finding.message,
      affectedField: finding.affectedField,
      severity: finding.severity,
      evidenceIds: finding.evidenceIds,
      originalPosition: original,
      effectivePosition: effective,
      humanReviewRequired: additionalPolicyReviewRequired,
    })),
    triggeredRuleIds: ordered.map((finding) => finding.ruleId),
    normalApplicationReviewRequired: true,
    additionalPolicyReviewRequired,
    humanReviewRequired: additionalPolicyReviewRequired,
    forbiddenTermsDetected: forbiddenTerms,
    policyScore,
    auditMetadata: {
      itemId: context.itemId,
      evaluatedAt: (options.now?.() ?? new Date()).toISOString(),
      modelIndependent: true,
    },
  });
}
