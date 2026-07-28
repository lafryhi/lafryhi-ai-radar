import { describe, expect, it } from "vitest";
import {
  EXCLUDED_ACCEPTANCE_CORPUS,
  RANKING_ACCEPTANCE_CORPUS,
  acceptanceInput,
} from "./acceptance-corpus.test-fixtures";
import { RANKING_POLICY_V1 } from "./policy";
import {
  applyScoreAdjustments,
  calculateBaseScore,
  determineRankBand,
  scoreRankingInput,
  type ScoreAdjustmentContext,
} from "./scoring";

const neutralContext: ScoreAdjustmentContext = {
  confidence: 1,
  materialLimitationCount: 0,
  missingPublicationTimestamp: false,
  futureTimestampWithinClockSkew: false,
  analysisCompleted: true,
  analysisPromptVersionSupported: true,
  sourceBlocked: false,
  hasUnknownEvidenceReference: false,
};

describe("deterministic ranking scoring", () => {
  it.each(RANKING_ACCEPTANCE_CORPUS)(
    "matches acceptance corpus: $name",
    ({ input, expected }) => {
      const result = scoreRankingInput(input, RANKING_POLICY_V1);
      expect(result.signals.map((signal) => signal.normalizedValue)).toEqual(
        expected.normalizedSignals,
      );
      expect(result.baseScore).toBeCloseTo(expected.baseScore, 12);
      expect(result.adjustments.map((adjustment) => adjustment.code)).toEqual(
        expected.adjustments,
      );
      expect(result.finalScore).toBe(expected.finalScore);
      expect(result.rankBand).toBe(expected.rankBand);
    },
  );

  it.each(EXCLUDED_ACCEPTANCE_CORPUS)(
    "fails safely for acceptance corpus exclusion: $name",
    ({ input, expectedAdjustment }) => {
      const result = scoreRankingInput(input, RANKING_POLICY_V1);
      expect(result.eligibility.status).toBe("excluded");
      expect(result.baseScore).toBeNull();
      expect(result.finalScore).toBeNull();
      expect(result.rankBand).toBeNull();
      expect(result.adjustments.map((adjustment) => adjustment.code)).toContain(
        expectedAdjustment,
      );
    },
  );

  it("calculates weighted base score at full precision", () => {
    const result = scoreRankingInput(acceptanceInput({
      impactScore: 33,
      relevanceScore: 67,
      confidenceScore: 81,
    }), RANKING_POLICY_V1);
    expect(result.baseScore).toBe(
      100 * (
        0.33 * 0.30
        + 0.67 * 0.25
        + 0.81 * 0.20
        + 1 * 0.10
        + 1 * 0.10
        + 1 * 0.05
      ),
    );
    expect(result.finalScore).toBe(67.85);
  });

  it("rounds only the final output to two decimal places", () => {
    const result = scoreRankingInput(acceptanceInput({
      impactScore: 1,
      relevanceScore: 1,
      confidenceScore: 100,
    }), RANKING_POLICY_V1);
    expect(result.baseScore).toBeCloseTo(45.55, 12);
    expect(result.finalScore).toBe(45.55);
  });

  it("applies confidence caps at strict below boundaries", () => {
    expect(applyScoreAdjustments(90, {
      ...neutralContext,
      confidence: 0.399999,
    }, RANKING_POLICY_V1).adjustedScore).toBe(49.99);
    expect(applyScoreAdjustments(90, {
      ...neutralContext,
      confidence: 0.40,
    }, RANKING_POLICY_V1).adjustedScore).toBe(69.99);
    expect(applyScoreAdjustments(90, {
      ...neutralContext,
      confidence: 0.60,
    }, RANKING_POLICY_V1).adjustedScore).toBe(90);
  });

  it("supports every adjustment in deterministic order", () => {
    const result = applyScoreAdjustments(90, {
      confidence: 0.30,
      materialLimitationCount: 2,
      missingPublicationTimestamp: true,
      futureTimestampWithinClockSkew: true,
      analysisCompleted: false,
      analysisPromptVersionSupported: false,
      sourceBlocked: true,
      hasUnknownEvidenceReference: true,
    }, RANKING_POLICY_V1);
    expect(result.adjustments.map((adjustment) => adjustment.code)).toEqual([
      "LOW_CONFIDENCE_CAP",
      "MATERIAL_LIMITATIONS",
      "MISSING_PUBLICATION_TIMESTAMP",
      "FUTURE_TIMESTAMP",
      "UNSUPPORTED_ANALYSIS_VERSION",
      "BLOCKED_SOURCE",
      "UNKNOWN_EVIDENCE",
      "FAILED_ANALYSIS",
    ]);
    expect(result.adjustedScore).toBeNull();
  });

  it("does not apply a material limitation penalty for fewer than two limitations", () => {
    expect(applyScoreAdjustments(80, {
      ...neutralContext,
      materialLimitationCount: 1,
    }, RANKING_POLICY_V1)).toEqual({
      adjustments: [],
      adjustedScore: 80,
    });
  });

  it.each([
    [0, "minimal"],
    [29.999, "minimal"],
    [30, "low"],
    [49.999, "low"],
    [50, "medium"],
    [69.999, "medium"],
    [70, "high"],
    [84.999, "high"],
    [85, "critical"],
    [100, "critical"],
  ] as const)("maps score %f to %s", (score, band) => {
    expect(determineRankBand(score, RANKING_POLICY_V1)).toBe(band);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 101])(
    "rejects invalid final score %s",
    (score) => expect(() => determineRankBand(score, RANKING_POLICY_V1)).toThrow(),
  );

  it("is monotonic in every positive factor before adjustments", () => {
    const baseline = scoreRankingInput(acceptanceInput({
      impactScore: 50,
      relevanceScore: 50,
      confidenceScore: 80,
    }), RANKING_POLICY_V1);
    for (const field of ["impactScore", "relevanceScore", "confidenceScore"] as const) {
      const higher = scoreRankingInput(acceptanceInput({
        impactScore: 50,
        relevanceScore: 50,
        confidenceScore: 80,
        [field]: field === "confidenceScore" ? 90 : 60,
      }), RANKING_POLICY_V1);
      expect(higher.baseScore).toBeGreaterThan(baseline.baseScore ?? 0);
    }
  });

  it("rejects unavailable signals during base scoring", () => {
    const result = scoreRankingInput(acceptanceInput(), RANKING_POLICY_V1);
    const signals = result.signals.map((signal) => ({ ...signal }));
    signals[0] = { ...signals[0], normalizedValue: null, availability: "invalid" };
    expect(() => calculateBaseScore(signals)).toThrow(
      "Cannot score unavailable ranking signal",
    );
  });

  it("produces identical output across repeated runs without mutating input", () => {
    const input = acceptanceInput();
    const before = structuredClone(input);
    const outputs = Array.from({ length: 50 }, () =>
      JSON.stringify(scoreRankingInput(input, RANKING_POLICY_V1))
    );
    expect(new Set(outputs).size).toBe(1);
    expect(input).toEqual(before);
  });
});
