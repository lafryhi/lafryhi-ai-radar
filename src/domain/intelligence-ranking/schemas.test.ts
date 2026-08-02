import { describe, expect, it } from "vitest";
import {
  NormalizedScoreSchema,
  RankingAssessmentSchema,
  RankingEligibilitySchema,
  RankingInputSchema,
  RankingPolicySchema,
  RankingSignalSchema,
  Score100Schema,
} from "./schemas";
import { RANKING_POLICY_V1 } from "./policy";

const eligibleAssessment = {
  id: "ranking-item-ranking-policy-v1",
  intelligenceItemId: "item-1",
  sourceDefinitionId: "source-1",
  inputDigest: "a".repeat(64),
  eligibility: { status: "eligible", reasonCodes: [] },
  signals: [
    ["impact", 0.8, 0.3],
    ["relevance", 0.8, 0.25],
    ["confidence", 0.8, 0.2],
    ["timeliness", 0.8, 0.1],
    ["evidenceSufficiency", 0.8, 0.1],
    ["sourceAuthority", 0.8, 0.05],
  ].map(([factor, normalizedValue, weight]) => ({
    factor,
    rawValue: normalizedValue,
    normalizedValue,
    availability: "available",
    weight,
    effectiveWeight: weight,
    contribution: Number(normalizedValue) * Number(weight),
    normalizationVersion: "ranking-normalization-v1",
    explanationCodes: [],
  })),
  adjustments: [],
  baseScore: 80,
  finalScore: 80,
  rankBand: "high",
  explanationCodes: [],
  whyRanked: [],
  policyVersion: "ranking-policy-v1",
  algorithmVersion: "deterministic-ranking-v1",
  analysisModel: "gemini-2.5-flash",
  analysisPromptVersion: "live-analysis-v1",
  cutoffAt: "2026-07-28T12:00:00.000Z",
  createdAt: "2026-07-28T12:00:00.000Z",
  supersedesAssessmentId: null,
};

describe("intelligence ranking schemas", () => {
  it("accepts minimum and maximum score boundaries", () => {
    expect(Score100Schema.parse(0)).toBe(0);
    expect(Score100Schema.parse(100)).toBe(100);
    expect(NormalizedScoreSchema.parse(0)).toBe(0);
    expect(NormalizedScoreSchema.parse(1)).toBe(1);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 100.01])(
    "rejects invalid Score100 value %s",
    (value) => expect(() => Score100Schema.parse(value)).toThrow(),
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01])(
    "rejects invalid normalized value %s",
    (value) => expect(() => NormalizedScoreSchema.parse(value)).toThrow(),
  );

  it("strictly rejects unknown object fields", () => {
    expect(() => RankingEligibilitySchema.parse({
      status: "eligible",
      reasonCodes: [],
      unexpected: true,
    })).toThrow();
    expect(() => RankingPolicySchema.parse({
      ...RANKING_POLICY_V1,
      unexpected: true,
    })).toThrow();
  });

  it("enforces eligibility reason-code state", () => {
    expect(RankingEligibilitySchema.parse({ status: "eligible", reasonCodes: [] })).toEqual({
      status: "eligible",
      reasonCodes: [],
    });
    expect(() => RankingEligibilitySchema.parse({
      status: "eligible",
      reasonCodes: ["SCORE_INVALID"],
    })).toThrow();
    expect(() => RankingEligibilitySchema.parse({
      status: "excluded",
      reasonCodes: [],
    })).toThrow();
  });

  it("enforces complete eligible and scoreless excluded assessments", () => {
    expect(RankingAssessmentSchema.parse(eligibleAssessment).finalScore).toBe(80);
    expect(() => RankingAssessmentSchema.parse({
      ...eligibleAssessment,
      finalScore: null,
    })).toThrow();
    expect(RankingAssessmentSchema.parse({
      ...eligibleAssessment,
      eligibility: { status: "excluded", reasonCodes: ["SCORE_INVALID"] },
      baseScore: null,
      finalScore: null,
      rankBand: null,
    }).rankBand).toBeNull();
    expect(() => RankingAssessmentSchema.parse({
      ...eligibleAssessment,
      eligibility: { status: "excluded", reasonCodes: ["SCORE_INVALID"] },
    })).toThrow();
    expect(() => RankingAssessmentSchema.parse({
      ...eligibleAssessment,
      signals: eligibleAssessment.signals.slice(1),
    })).toThrow("exactly one signal");
    expect(() => RankingAssessmentSchema.parse({
      ...eligibleAssessment,
      signals: eligibleAssessment.signals.map((signal, index) =>
        index === 1 ? { ...signal, factor: "impact" } : signal
      ),
    })).toThrow("exactly one signal");
  });

  it("rejects contradictory signal availability", () => {
    const signal = {
      factor: "impact",
      rawValue: 80,
      normalizedValue: 0.8,
      availability: "available",
      weight: 0.3,
      effectiveWeight: 0.3,
      contribution: 0.24,
      normalizationVersion: "normalization-v1",
      explanationCodes: [],
    };
    expect(RankingSignalSchema.parse(signal).normalizedValue).toBe(0.8);
    expect(() => RankingSignalSchema.parse({
      ...signal,
      availability: "unknown",
    })).toThrow();
    expect(() => RankingSignalSchema.parse({
      ...signal,
      normalizedValue: null,
    })).toThrow();
    expect(() => RankingSignalSchema.parse({
      ...signal,
      contribution: 0.25,
    })).toThrow("must equal normalized value");
  });

  it("strictly validates nested ranking input boundaries", () => {
    expect(() => RankingInputSchema.parse({
      intelligenceItem: { unexpected: true },
      sourceDefinition: { unexpected: true },
      reportingPeriod: {
        start: "2026-07-21T12:00:00.000Z",
        end: "2026-07-28T12:00:00.000Z",
        unexpected: true,
      },
      cutoffAt: "2026-07-28T12:00:00.000Z",
      policyVersion: "ranking-policy-v1",
    })).toThrow();
  });
});
