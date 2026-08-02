import { describe, expect, it } from "vitest";
import type { EditorialPolicyContext } from "@/domain/editorial-policy";
import { calculateComparativeMetrics } from "./evaluation/metrics";
import type { EvaluationCaseResult, ModelCaseResult } from "./evaluation/types";
import {
  EDITORIAL_POLICY_CONSTITUTION,
  detectForbiddenTerms,
  evaluateEditorialPolicyFacts,
  normalizeEditorialText,
  validateEditorialPolicyConstitution,
} from "./editorial-policy-engine";

const fixedNow = () => new Date("2026-07-30T12:00:00.000Z");
const baseContext: EditorialPolicyContext = {
  itemId: "case",
  allowedPositions: ["ACT_NOW", "RUN_EXPERIMENT", "MONITOR", "DEFER", "IGNORE", "AVOID"],
  sourceTrust: "VERIFIED",
  trustedSourceCount: 0,
  hasSourceConflict: false,
  promotionalContent: false,
  lowImpactContent: false,
  numericalOrDateSensitive: false,
  pendingVerification: false,
  humanReviewState: "PENDING",
  configuredForbiddenTerms: [] as string[],
  preDetectedForbiddenTerms: [] as string[],
  evidenceState: "UNKNOWN",
  uncertaintyState: "NONE",
  sourceAuthority: "UNKNOWN",
  materialImpact: "UNKNOWN",
  confidenceQualified: false,
  numericalClaimsVerified: false,
  normalApplicationReviewRequired: true,
};

function policy(
  originalPosition: "ACT_NOW" | "RUN_EXPERIMENT" | "MONITOR" | "DEFER" | "IGNORE" | "AVOID" | "INSUFFICIENT_EVIDENCE",
  overrides: Partial<typeof baseContext> = {},
  decisionText = "",
) {
  return evaluateEditorialPolicyFacts({
    originalPosition,
    evidenceCount: 2,
    evidenceIds: ["E1", "E2"],
    signalImportance: 60,
    confidence: 60,
    decisionText,
    context: { ...baseContext, ...overrides },
  }, { now: fixedNow });
}

describe("Editorial Policy Engine constitution", () => {
  it("loads the strict versioned eight-rule constitution with unique priority", () => {
    expect(EDITORIAL_POLICY_CONSTITUTION.policyVersion).toBe("editorial-policy-v1.1");
    expect(EDITORIAL_POLICY_CONSTITUTION.rules.map((rule) => rule.id)).toEqual([
      "EP-001", "EP-002", "EP-003", "EP-004", "EP-005", "EP-006", "EP-007", "EP-008",
    ]);
    expect(new Set(EDITORIAL_POLICY_CONSTITUTION.rules.map((rule) => rule.priority)).size).toBe(8);
  });

  it("rejects duplicate IDs, priorities, invalid thresholds, actions, terms, and missing reasons", () => {
    const clone = <T,>() => structuredClone(EDITORIAL_POLICY_CONSTITUTION) as unknown as T;
    const duplicateId = clone<{ rules: Array<{ id: string }> }>();
    duplicateId.rules[1].id = duplicateId.rules[0].id;
    expect(() => validateEditorialPolicyConstitution(duplicateId)).toThrow();
    const duplicatePriority = clone<{ rules: Array<{ priority: number }> }>();
    duplicatePriority.rules[1].priority = duplicatePriority.rules[0].priority;
    expect(() => validateEditorialPolicyConstitution(duplicatePriority)).toThrow();
    const threshold = clone<{ thresholds: { actNowMinimumConfidence: number } }>();
    threshold.thresholds.actNowMinimumConfidence = 101;
    expect(() => validateEditorialPolicyConstitution(threshold)).toThrow();
    const action = clone<{ rules: Array<{ action: string }> }>();
    action.rules[0].action = "PUBLISH";
    expect(() => validateEditorialPolicyConstitution(action)).toThrow();
    const terms = clone<{ forbiddenTerms: string[] }>();
    terms.forbiddenTerms = ["garanti", "GARÁNTI"];
    expect(() => validateEditorialPolicyConstitution(terms)).toThrow();
    const reason = clone<{ rules: Array<{ reasonTemplate: string }> }>();
    reason.rules[0].reasonTemplate = "";
    expect(() => validateEditorialPolicyConstitution(reason)).toThrow();
  });
});

describe("Editorial Policy Engine rules and regression cases", () => {
  it("EP-001 downgrades official-google-announcement ACT_NOW to MONITOR", () => {
    const result = policy("ACT_NOW", {
      itemId: "official-google-announcement",
      allowedPositions: ["RUN_EXPERIMENT", "MONITOR"],
      sourceTrust: "TRUSTED",
      trustedSourceCount: 1,
      evidenceState: "SUFFICIENT",
      sourceAuthority: "AUTHORITATIVE",
      materialImpact: "MEDIUM",
      confidenceQualified: true,
    });
    expect(result).toMatchObject({
      originalPosition: "ACT_NOW",
      effectivePosition: "MONITOR",
      humanReviewRequired: true,
    });
    expect(result.triggeredRuleIds).toEqual(expect.arrayContaining(["EP-001", "EP-008"]));
  });

  it("EP-006 detects forbidden language in long-press-article and requires review", () => {
    const result = policy("RUN_EXPERIMENT", {
      itemId: "long-press-article",
      allowedPositions: ["RUN_EXPERIMENT", "MONITOR", "DEFER"],
      configuredForbiddenTerms: ["all firms"],
    }, "The survey proves that ALL—FIRMS will adopt it.");
    expect(result.forbiddenTermsDetected).toContain("all firms");
    expect(result.action).toBe("REQUIRE_HUMAN_REVIEW");
    expect(result.triggeredRuleIds).toEqual(expect.arrayContaining(["EP-006", "EP-008"]));
  });

  it("EP-003 and EP-007 preserve contradictory-source uncertainty on a review path", () => {
    const result = policy("INSUFFICIENT_EVIDENCE", {
      itemId: "contradictory-source",
      allowedPositions: ["MONITOR", "DEFER"],
      hasSourceConflict: true,
      evidenceState: "SUFFICIENT",
      uncertaintyState: "SOURCE_CONFLICT",
    });
    expect(result.effectivePosition).toBe("DEFER");
    expect(result.humanReviewRequired).toBe(true);
    expect(result.triggeredRuleIds).toEqual(expect.arrayContaining(["EP-003", "EP-007", "EP-008"]));
  });

  it("EP-005 downgrades dates-and-numerical-claims without strict escalation thresholds", () => {
    const result = policy("ACT_NOW", {
      itemId: "dates-and-numerical-claims",
      allowedPositions: ["ACT_NOW", "MONITOR"],
      numericalOrDateSensitive: true,
    });
    expect(result.effectivePosition).toBe("MONITOR");
    expect(result.triggeredRuleIds).toContain("EP-005");
  });

  it("EP-004 and EP-007 convert should-remain-pending to DEFER with review", () => {
    const result = policy("INSUFFICIENT_EVIDENCE", {
      itemId: "should-remain-pending",
      allowedPositions: ["MONITOR", "DEFER", "AVOID"],
      pendingVerification: true,
      evidenceState: "SUFFICIENT",
      uncertaintyState: "PENDING_VERIFICATION",
    });
    expect(result.effectivePosition).toBe("DEFER");
    expect(result.triggeredRuleIds).toEqual(expect.arrayContaining(["EP-004", "EP-007", "EP-008"]));
  });

  it("EP-002 constrains low-impact-promotion MONITOR to IGNORE", () => {
    const result = policy("MONITOR", {
      itemId: "low-impact-promotion",
      allowedPositions: ["IGNORE"],
      promotionalContent: true,
      lowImpactContent: true,
    });
    expect(result).toMatchObject({
      originalPosition: "MONITOR",
      effectivePosition: "IGNORE",
      action: "REQUIRE_HUMAN_REVIEW",
      humanReviewRequired: true,
    });
    expect(result.triggeredRuleIds).toEqual(expect.arrayContaining(["EP-002", "EP-008"]));
  });

  it("EP-008 requires review for out-of-policy positions and material drift", () => {
    const result = policy("RUN_EXPERIMENT", {
      allowedPositions: ["MONITOR"],
      scoreDrift: 20,
    });
    expect(result.effectivePosition).toBe("MONITOR");
    expect(result.triggeredRuleIds).toContain("EP-008");
    expect(result.humanReviewRequired).toBe(true);
  });

  it("preserves a genuine insufficient-evidence result when no policy substitute applies", () => {
    const result = policy("INSUFFICIENT_EVIDENCE", {
      evidenceState: "INSUFFICIENT",
      uncertaintyState: "EVIDENCE_INSUFFICIENT",
    });
    expect(result).toMatchObject({
      originalPosition: "INSUFFICIENT_EVIDENCE",
      effectivePosition: "INSUFFICIENT_EVIDENCE",
      action: "ALLOW",
      humanReviewRequired: false,
      additionalPolicyReviewRequired: false,
      normalApplicationReviewRequired: true,
    });
  });

  it("does not convert valid insufficient evidence merely because content is promotional or rejected", () => {
    const result = policy("INSUFFICIENT_EVIDENCE", {
      allowedPositions: ["IGNORE", "AVOID"],
      promotionalContent: true,
      lowImpactContent: true,
      evidenceState: "INSUFFICIENT",
      uncertaintyState: "EVIDENCE_INSUFFICIENT",
    });
    expect(result.effectivePosition).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.triggeredRuleIds).not.toContain("EP-007");
    expect(result.additionalPolicyReviewRequired).toBe(false);
  });

  it("preserves legitimate authoritative high-impact ACT_NOW across languages", () => {
    for (const itemId of ["arabic-policy-update", "high-impact-business-news"]) {
      const result = policy("ACT_NOW", {
        itemId,
        allowedPositions: ["ACT_NOW", "MONITOR"],
        evidenceState: "SUFFICIENT",
        sourceAuthority: "AUTHORITATIVE",
        materialImpact: "HIGH",
        confidenceQualified: true,
      });
      expect(result.effectivePosition).toBe("ACT_NOW");
      expect(result.action).toBe("ALLOW");
      expect(result.additionalPolicyReviewRequired).toBe(false);
      expect(result.normalApplicationReviewRequired).toBe(true);
    }
  });
});

describe("Editorial Policy Engine determinism, privacy, and conflict resolution", () => {
  it("is model-independent and deterministic for identical editorial facts", () => {
    const facts = {
      originalPosition: "ACT_NOW" as const,
      evidenceCount: 1,
      evidenceIds: ["E1"],
      signalImportance: 40,
      confidence: 50,
      decisionText: "No forbidden language.",
      context: { ...baseContext, itemId: "same-input" },
    };
    const withGeminiMetadata = { ...facts, model: "gemini" };
    const withOtherMetadata = { ...facts, model: "another-provider" };
    expect(evaluateEditorialPolicyFacts(withGeminiMetadata, { now: fixedNow }))
      .toEqual(evaluateEditorialPolicyFacts(withOtherMetadata, { now: fixedNow }));
  });

  it("normalizes Unicode, accents, punctuation, case, and token boundaries", () => {
    expect(normalizeEditorialText("  GARÁNTI—pour tous! ")).toBe("garanti pour tous");
    expect(detectForbiddenTerms("Ce résultat est GARÁNTI.", ["garanti"])).toEqual(["garanti"]);
    expect(detectForbiddenTerms("The small-firms survey is limited.", ["all firms"])).toEqual([]);
  });

  it("preserves all rule reasons, applies priority, and never upgrades a decision", () => {
    const result = policy("MONITOR", {
      allowedPositions: ["MONITOR", "DEFER"],
      hasSourceConflict: true,
      pendingVerification: true,
      configuredForbiddenTerms: ["garanti"],
    }, "Résultat garanti.");
    expect(result.effectivePosition).toBe("MONITOR");
    expect(result.triggeredRuleIds).toEqual(["EP-006", "EP-003", "EP-004", "EP-008"]);
    expect(result.action).toBe("REQUIRE_HUMAN_REVIEW");
    expect(result.reasons).toHaveLength(4);
  });

  it("never re-upgrades an ACT_NOW decision when no allowed lower position exists", () => {
    const result = policy("ACT_NOW", { allowedPositions: ["ACT_NOW"] });
    expect(result.effectivePosition).toBe("MONITOR");
    expect(result.effectivePosition).not.toBe(result.originalPosition);
    expect(result.humanReviewRequired).toBe(true);
  });

  it("preserves the original decision and emits only sanitized audit metadata", () => {
    const secret = "token=private-source-body";
    const result = policy("ACT_NOW", {}, secret);
    expect(result.originalPosition).toBe("ACT_NOW");
    expect(result.effectivePosition).toBe("MONITOR");
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(result.auditMetadata).toEqual({
      itemId: "case",
      evaluatedAt: "2026-07-30T12:00:00.000Z",
      modelIndependent: true,
    });
  });

  it("reports raw and policy-adjusted behavior without hiding the raw disagreement", () => {
    const baselinePolicy = policy("MONITOR", { allowedPositions: ["MONITOR"] });
    const candidatePolicy = policy("ACT_NOW", { allowedPositions: ["MONITOR"] });
    const modelResult = (model: string, recommendation: string, editorialPolicy: typeof baselinePolicy): ModelCaseResult => ({
      model,
      signal: {
        requestedModel: model, actualModel: model, fallbackUsed: false, attempts: 1, durationMs: 1,
        requestSucceeded: true, jsonParseValid: true, schemaValid: true, applicationValid: true,
        exactQuoteValid: true, evidenceIdsValid: true, enumValid: true, insufficientEvidence: false,
        candidateCount: 1,
      },
      pipelineCompleted: true,
      status: "READY",
      recommendation,
      evidenceCount: 2,
      outputText: "[REDACTED]",
      editorialPolicy,
    });
    const result: EvaluationCaseResult = {
      caseId: "raw-adjusted",
      category: "official-source",
      language: "en",
      baseline: modelResult("baseline", "MONITOR", baselinePolicy),
      candidate: modelResult("candidate", "ACT_NOW", candidatePolicy),
      expectationChecks: {
        requiredKeywords: true,
        forbiddenKeywords: true,
        insufficientEvidenceCorrect: true,
        unsupportedClaims: false,
        quotationMismatch: false,
      },
      invariantViolations: [],
    };
    expect(calculateComparativeMetrics([result])).toMatchObject({
      rawRecommendationAgreementRate: 0,
      policyAdjustedRecommendationAgreementRate: 1,
      policyOverrideRate: 1,
      effectivePositionDowngradeRate: 1,
      actionDowngradeRate: 0,
      requireHumanReviewRate: 1,
      normalApplicationReviewRate: 1,
      overEscalationCorrectionRate: 1,
    });
    expect(result.candidate.recommendation).toBe("ACT_NOW");
    expect(result.candidate.editorialPolicy?.effectivePosition).toBe("MONITOR");
  });
});
