import { describe, expect, it } from "vitest";
import { AnalysisResultSchema, SourceRecordSchema, StoredAnalysisSchema } from "./schemas";
import { analysisFixture, sourceFixture } from "@/test/fixtures";

describe("schemas", () => {
  it("accepts complete source and analysis records", () => {
    expect(SourceRecordSchema.parse(sourceFixture).id).toBe("source-1");
    expect(AnalysisResultSchema.parse(analysisFixture).confidenceScore).toBe(90);
  });
  it("rejects unsupported scores and inconsistent opportunity fields", () => {
    expect(() => AnalysisResultSchema.parse({ ...analysisFixture, confidenceScore: 101 })).toThrow();
    expect(() => AnalysisResultSchema.parse({ ...analysisFixture, opportunity: { ...analysisFixture.opportunity, deadline: "2026-08-01T00:00:00.000Z" } })).toThrow();
    expect(() => AnalysisResultSchema.parse({ ...analysisFixture, duplicateAnalysis: { similarityScore: 90, classification: "duplicate", relatedPreviousArticles: [], duplicateReason: null } })).toThrow();
  });
  it("reads legacy production analyses without rewriting stored records", () => {
    const legacy = StoredAnalysisSchema.parse({
      id: "legacy-analysis", sourceRecordId: "legacy-source", processingRunId: "legacy-run",
      createdAt: "2026-07-24T00:00:00.000Z",
      summary: analysisFixture.summary, whyItMatters: analysisFixture.whyItMatters,
      category: analysisFixture.category, relevanceScore: 72, confidenceScore: 90,
      recommendedAction: analysisFixture.recommendedAction, evidence: analysisFixture.evidence,
      warnings: [], opportunity: analysisFixture.opportunity,
    });
    expect(legacy.importanceScore).toBe(72);
    expect(legacy.overallRecommendation).toBe("Needs Human Attention");
    expect(legacy.duplicateAnalysis.classification).toBe("unique");
  });
});
