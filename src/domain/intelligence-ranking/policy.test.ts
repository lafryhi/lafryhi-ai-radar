import { describe, expect, it } from "vitest";
import { getRankingPolicy, RANKING_POLICY_V1 } from "./policy";
import { RankingPolicySchema } from "./schemas";

function policyWith(weights: Record<string, number>) {
  return {
    ...RANKING_POLICY_V1,
    weights,
  };
}

describe("ranking policy", () => {
  it("validates the compiled versioned policy", () => {
    expect(RankingPolicySchema.parse(RANKING_POLICY_V1)).toEqual(RANKING_POLICY_V1);
    expect(RANKING_POLICY_V1.version).toBe("ranking-policy-v1");
    expect(RANKING_POLICY_V1.algorithmVersion).toBe("deterministic-ranking-v1");
    expect(Object.isFrozen(RANKING_POLICY_V1)).toBe(true);
    expect(Object.isFrozen(RANKING_POLICY_V1.weights)).toBe(true);
    expect(Object.isFrozen(RANKING_POLICY_V1.confidenceCaps)).toBe(true);
  });

  it("rejects weight totals below and above one", () => {
    expect(() => RankingPolicySchema.parse(policyWith({
      ...RANKING_POLICY_V1.weights,
      impact: 0.29,
    }))).toThrow();
    expect(() => RankingPolicySchema.parse(policyWith({
      ...RANKING_POLICY_V1.weights,
      impact: 0.31,
    }))).toThrow();
  });

  it("rejects missing and extra ranking factors", () => {
    const missingImpact = Object.fromEntries(
      Object.entries(RANKING_POLICY_V1.weights).filter(([factor]) => factor !== "impact"),
    );
    expect(() => RankingPolicySchema.parse(policyWith(missingImpact))).toThrow();
    expect(() => RankingPolicySchema.parse(policyWith({
      ...RANKING_POLICY_V1.weights,
      popularity: 0,
    }))).toThrow();
  });

  it("rejects incomplete and extra source-authority mappings", () => {
    const missingOfficial = Object.fromEntries(
      Object.entries(RANKING_POLICY_V1.sourceAuthority).filter(([level]) => level !== "official"),
    );
    expect(() => RankingPolicySchema.parse({
      ...RANKING_POLICY_V1,
      sourceAuthority: missingOfficial,
    })).toThrow();
    expect(() => RankingPolicySchema.parse({
      ...RANKING_POLICY_V1,
      sourceAuthority: {
        ...RANKING_POLICY_V1.sourceAuthority,
        unknown: 0.1,
      },
    })).toThrow();
    expect(() => RankingPolicySchema.parse({
      ...RANKING_POLICY_V1,
      sourceAuthority: {
        ...RANKING_POLICY_V1.sourceAuthority,
        blocked: 0,
      },
    })).toThrow();
  });

  it("requires deterministic confidence-cap ordering and valid boundaries", () => {
    expect(() => RankingPolicySchema.parse({
      ...RANKING_POLICY_V1,
      confidenceCaps: [...RANKING_POLICY_V1.confidenceCaps].reverse(),
    })).toThrow();
    expect(() => RankingPolicySchema.parse({
      ...RANKING_POLICY_V1,
      confidenceCaps: [
        { below: 0.4, maximumFinalScore: 69.99 },
        { below: 0.6, maximumFinalScore: 49.99 },
      ],
    })).toThrow();
    expect(() => RankingPolicySchema.parse({
      ...RANKING_POLICY_V1,
      confidenceCaps: [{ below: 0, maximumFinalScore: 49.99 }],
    })).toThrow();
    expect(() => RankingPolicySchema.parse({
      ...RANKING_POLICY_V1,
      confidenceCaps: [{ below: 1.01, maximumFinalScore: 49.99 }],
    })).toThrow();
  });

  it("rejects thresholds that make a rank band unreachable", () => {
    expect(() => RankingPolicySchema.parse({
      ...RANKING_POLICY_V1,
      rankBandThresholds: {
        ...RANKING_POLICY_V1.rankBandThresholds,
        low: 0,
      },
    })).toThrow("minimal band is reachable");
  });

  it("selects policies explicitly by version", () => {
    expect(getRankingPolicy("ranking-policy-v1")).toBe(RANKING_POLICY_V1);
    expect(() => getRankingPolicy("ranking-policy-v2")).toThrow(
      "Unsupported ranking policy version",
    );
  });
});
