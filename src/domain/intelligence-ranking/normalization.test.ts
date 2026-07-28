import { describe, expect, it } from "vitest";
import {
  FUTURE_CLOCK_SKEW_MS,
  normalizeEvidenceSufficiency,
  normalizeRankingSignals,
  normalizeScore100,
  normalizeSourceAuthority,
  normalizeTimeliness,
} from "./normalization";
import { acceptanceInput, ACCEPTANCE_CUTOFF } from "./acceptance-corpus.test-fixtures";
import { RANKING_POLICY_V1 } from "./policy";

const HOUR_MS = 60 * 60 * 1000;
const cutoff = Date.parse(ACCEPTANCE_CUTOFF);
const atAge = (ageMs: number) => new Date(cutoff - ageMs).toISOString();

describe("ranking normalization", () => {
  it("normalizes score boundaries without rounding", () => {
    expect(normalizeScore100(0)).toBe(0);
    expect(normalizeScore100(1)).toBe(0.01);
    expect(normalizeScore100(33)).toBe(0.33);
    expect(normalizeScore100(100)).toBe(1);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 100.01])(
    "rejects invalid score %s",
    (score) => expect(() => normalizeScore100(score)).toThrow(),
  );

  it.each([
    [0, 1],
    [24 * HOUR_MS, 1],
    [24 * HOUR_MS + 1, 0.90],
    [48 * HOUR_MS, 0.90],
    [48 * HOUR_MS + 1, 0.80],
    [72 * HOUR_MS, 0.80],
    [72 * HOUR_MS + 1, 0.65],
    [120 * HOUR_MS, 0.65],
    [120 * HOUR_MS + 1, 0.50],
    [168 * HOUR_MS, 0.50],
    [168 * HOUR_MS + 1, 0.25],
    [336 * HOUR_MS, 0.25],
    [336 * HOUR_MS + 1, 0.10],
  ])("normalizes age %dms to %f", (ageMs, expected) => {
    expect(normalizeTimeliness(atAge(ageMs), ACCEPTANCE_CUTOFF).value).toBe(expected);
  });

  it("accepts future timestamps through five minutes and invalidates later timestamps", () => {
    expect(normalizeTimeliness(
      new Date(cutoff + FUTURE_CLOCK_SKEW_MS).toISOString(),
      ACCEPTANCE_CUTOFF,
    )).toMatchObject({
      value: 1,
      availability: "available",
      withinFutureClockSkew: true,
    });
    expect(normalizeTimeliness(
      new Date(cutoff + FUTURE_CLOCK_SKEW_MS + 1).toISOString(),
      ACCEPTANCE_CUTOFF,
    )).toMatchObject({
      value: null,
      availability: "invalid",
      withinFutureClockSkew: false,
    });
  });

  it("marks missing and invalid timestamps invalid", () => {
    expect(normalizeTimeliness(undefined, ACCEPTANCE_CUTOFF).availability).toBe("invalid");
    expect(normalizeTimeliness("invalid", ACCEPTANCE_CUTOFF).availability).toBe("invalid");
    expect(normalizeTimeliness(ACCEPTANCE_CUTOFF, "invalid").availability).toBe("invalid");
  });

  it("implements the exact evidence sufficiency formula", () => {
    expect(normalizeEvidenceSufficiency([], [])).toMatchObject({
      value: 0,
      groundedClaimCount: 0,
      claimComponent: 0,
      referenceComponent: 0,
      limitationPenalty: 0,
    });
    expect(normalizeEvidenceSufficiency([
      { claim: "One", evidenceRefs: ["source-content"] },
    ], [])).toMatchObject({
      value: 0.5,
      groundedClaimCount: 1,
      claimComponent: 0.5,
      referenceComponent: 0.5,
    });
    expect(normalizeEvidenceSufficiency([
      { claim: "One", evidenceRefs: ["source-content"] },
      { claim: "Two", evidenceRefs: ["source-metadata"] },
    ], [])).toMatchObject({
      value: 0.85,
      groundedClaimCount: 2,
      claimComponent: 0.75,
      referenceComponent: 1,
    });
    expect(normalizeEvidenceSufficiency([
      { claim: "One", evidenceRefs: ["source-content"] },
      { claim: "Two", evidenceRefs: ["source-metadata"] },
      { claim: "Three", evidenceRefs: ["source-content"] },
    ], ["A", "B", "C", "D", "E"])).toMatchObject({
      value: 0.75,
      groundedClaimCount: 3,
      limitationPenalty: 1,
    });
  });

  it("counts only unique accepted evidence and never infers corroboration", () => {
    const result = normalizeEvidenceSufficiency([
      { claim: "One", evidenceRefs: ["source-content", "source-content"] },
      { claim: "Two", evidenceRefs: ["source-content", "external-search"] },
    ], []);
    expect(result.uniqueAcceptedEvidenceReferences).toEqual(["source-content"]);
    expect(result.referenceComponent).toBe(0.5);
    expect(result.hasUnknownEvidenceReference).toBe(true);
  });

  it("maps every source authority level from the policy", () => {
    expect(normalizeSourceAuthority("official", RANKING_POLICY_V1)).toBe(1);
    expect(normalizeSourceAuthority("verified", RANKING_POLICY_V1)).toBe(0.8);
    expect(normalizeSourceAuthority("community", RANKING_POLICY_V1)).toBe(0.5);
    expect(normalizeSourceAuthority("experimental", RANKING_POLICY_V1)).toBe(0.2);
    expect(normalizeSourceAuthority("blocked", RANKING_POLICY_V1)).toBeNull();
  });

  it("creates all six signals in fixed factor order", () => {
    const normalized = normalizeRankingSignals(acceptanceInput(), RANKING_POLICY_V1);
    expect(normalized.signals.map((signal) => signal.factor)).toEqual([
      "impact",
      "relevance",
      "confidence",
      "timeliness",
      "evidenceSufficiency",
      "sourceAuthority",
    ]);
    expect(normalized.signals.every((signal) =>
      signal.normalizedValue !== null
      && signal.normalizedValue >= 0
      && signal.normalizedValue <= 1
    )).toBe(true);
  });
});
