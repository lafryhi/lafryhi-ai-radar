import { describe, expect, it } from "vitest";
import type { RankingAssessment, RankingSignal } from "./contracts";
import {
  acceptanceInput,
  RANKING_ORDERING_ACCEPTANCE_CORPUS,
} from "./acceptance-corpus.test-fixtures";
import {
  compareRankedCandidates,
  compareUnicodeCodePoints,
  rankCandidates,
  type RankableCandidate,
} from "./tie-breakers";

function signals(overrides: Partial<Record<RankingSignal["factor"], number>> = {}): RankingSignal[] {
  return [
    ["impact", overrides.impact ?? 0.8],
    ["relevance", overrides.relevance ?? 0.8],
    ["confidence", overrides.confidence ?? 0.8],
    ["timeliness", overrides.timeliness ?? 1],
    ["evidenceSufficiency", overrides.evidenceSufficiency ?? 0.8],
    ["sourceAuthority", overrides.sourceAuthority ?? 1],
  ].map(([factor, value]) => ({
    factor: factor as RankingSignal["factor"],
    rawValue: value,
    normalizedValue: value as number,
    availability: "available",
    weight: 0,
    effectiveWeight: 0,
    contribution: 0,
    normalizationVersion: "ranking-normalization-v1",
    explanationCodes: [],
  }));
}

function candidate(overrides: {
  id?: string;
  title?: string;
  createdAt?: string;
  finalScore?: number;
  signals?: Partial<Record<RankingSignal["factor"], number>>;
} = {}): RankableCandidate {
  const input = acceptanceInput({
    id: overrides.id ?? "item-a",
    title: overrides.title ?? "Alpha",
    createdAt: overrides.createdAt ?? "2026-07-28T10:00:00.000Z",
  });
  const assessment: RankingAssessment = {
    id: `ranking-${input.intelligenceItem.id}`,
    intelligenceItemId: input.intelligenceItem.id,
    sourceDefinitionId: input.sourceDefinition.id,
    inputDigest: "a".repeat(64),
    eligibility: { status: "eligible", reasonCodes: [] },
    signals: signals(overrides.signals),
    adjustments: [],
    baseScore: overrides.finalScore ?? 80,
    finalScore: overrides.finalScore ?? 80,
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
  return {
    intelligenceItem: input.intelligenceItem,
    assessment,
  };
}

describe("stable ranking tie-breakers", () => {
  it("applies every ordering key in the approved sequence", () => {
    const cases: Array<[RankableCandidate, RankableCandidate]> = [
      [candidate({ finalScore: 90 }), candidate({ finalScore: 80 })],
      [candidate({ signals: { confidence: 0.9 } }), candidate({ signals: { confidence: 0.8 } })],
      [candidate({ signals: { evidenceSufficiency: 0.9 } }), candidate({ signals: { evidenceSufficiency: 0.8 } })],
      [candidate({ signals: { impact: 0.9 } }), candidate({ signals: { impact: 0.8 } })],
      [candidate({ createdAt: "2026-07-28T11:00:00.000Z" }), candidate({ createdAt: "2026-07-28T10:00:00.000Z" })],
      [candidate({ signals: { sourceAuthority: 1 } }), candidate({ signals: { sourceAuthority: 0.8 } })],
      [candidate({ title: "Alpha" }), candidate({ title: "Beta" })],
      [candidate({ id: "item-a" }), candidate({ id: "item-b" })],
    ];
    for (const [higher, lower] of cases) {
      expect(compareRankedCandidates(higher, lower)).toBeLessThan(0);
      expect(compareRankedCandidates(lower, higher)).toBeGreaterThan(0);
    }
  });

  it("compares Unicode code points without locale dependence", () => {
    expect(compareUnicodeCodePoints("A", "B")).toBeLessThan(0);
    expect(compareUnicodeCodePoints("\u{1F600}", "\u{FFFD}")).toBeGreaterThan(0);
    expect(compareUnicodeCodePoints("e\u0301", "é")).toBe(0);
  });

  it("returns a new deterministically ordered array", () => {
    const original = RANKING_ORDERING_ACCEPTANCE_CORPUS.candidates.map(
      (entry) => candidate(entry),
    );
    const ranked = rankCandidates(original);
    expect(ranked.map((entry) => entry.intelligenceItem.id)).toEqual(
      RANKING_ORDERING_ACCEPTANCE_CORPUS.expectedOrdering,
    );
    expect(original.map((entry) => entry.intelligenceItem.id)).toEqual(
      RANKING_ORDERING_ACCEPTANCE_CORPUS.candidates.map((entry) => entry.id),
    );
  });

  it("produces identical ordering across repeated shuffled inputs", () => {
    const candidates = [
      candidate({ id: "item-d", finalScore: 70 }),
      candidate({ id: "item-a", finalScore: 90 }),
      candidate({ id: "item-c", finalScore: 80 }),
      candidate({ id: "item-b", finalScore: 80 }),
    ];
    const expected = ["item-a", "item-b", "item-c", "item-d"];
    for (let index = 0; index < 50; index += 1) {
      const rotated = [
        ...candidates.slice(index % candidates.length),
        ...candidates.slice(0, index % candidates.length),
      ];
      expect(rankCandidates(rotated).map((entry) => entry.intelligenceItem.id)).toEqual(expected);
    }
  });
});
