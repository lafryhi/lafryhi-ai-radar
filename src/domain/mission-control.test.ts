import { describe, expect, it } from "vitest";
import { IntelligenceItemSchema, rankIntelligenceItems } from "@/domain/mission-control";

const item = (overrides: Record<string, unknown> = {}) => ({ id: "one", title: "A prepared item", summary: "This prepared sample has enough descriptive text for the presentation contract.", sourceName: "Prepared source", category: "Enterprise AI", impactScore: 50, confidenceScore: 50, evidenceCount: 1, verificationStatus: "verified", editorialStatus: "approved", createdAt: "2026-01-05T09:00:00.000Z", ...overrides });

describe("Mission Control domain", () => {
  it("rejects scores outside the 0-100 range", () => { expect(() => IntelligenceItemSchema.parse(item({ impactScore: 101 }))).toThrow(); expect(() => IntelligenceItemSchema.parse(item({ confidenceScore: -1 }))).toThrow(); });
  it("sorts deterministically by impact, confidence, evidence, title, and id", () => { const ranked = rankIntelligenceItems([item({ id: "b", title: "B", impactScore: 80 }), item({ id: "a", title: "A", impactScore: 80, confidenceScore: 90 }), item({ id: "c", title: "C", impactScore: 90 })].map((value) => IntelligenceItemSchema.parse(value))); expect(ranked.map((value) => value.id)).toEqual(["c", "a", "b"]); });
});
