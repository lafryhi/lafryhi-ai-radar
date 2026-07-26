import { describe, expect, it } from "vitest";
import { GEMINI_RESPONSE_JSON_SCHEMA, parseGeminiResponse } from "./ai";
import { AnalysisResultSchema } from "@/domain/schemas";
import { geminiAnalysisFixture } from "@/test/fixtures";

describe("Gemini response parsing", () => {
  it("provides the production response schema to Gemini", () => {
    expect(GEMINI_RESPONSE_JSON_SCHEMA).toMatchObject({
      type: "object",
      required: expect.arrayContaining(["summary", "keyPoints", "importanceScore", "noveltyScore", "overallRecommendation", "entities", "duplicateAnalysis"]),
    });
  });
  it("rejects malformed JSON", () => expect(() => parseGeminiResponse("{bad")).toThrow("malformed JSON"));
  it("rejects schema-invalid JSON", () => expect(() => parseGeminiResponse(JSON.stringify({ summary: "missing fields" }))).toThrow("schema validation"));
  it("rejects unsupported output fields", () => expect(() => parseGeminiResponse(JSON.stringify({ ...geminiAnalysisFixture, rawResponse: "unsafe" }))).toThrow("schema validation"));
  it("accepts strict output, derives relevance, and normalizes repeated entities", () => {
    const parsed = parseGeminiResponse(JSON.stringify({
      ...geminiAnalysisFixture,
      mentionedCompanies: ["Google", " google "],
      entities: [...geminiAnalysisFixture.entities, { name: "google", normalizedName: "Google", type: "company" }],
    }));
    expect(parsed.category).toBe("developer_announcement");
    expect(parsed.relevanceScore).toBe(71);
    expect(parsed.mentionedCompanies).toEqual(["Google"]);
    expect(parsed.entities.filter((entity) => entity.normalizedName === "Google")).toHaveLength(1);
  });
  it("bounds potential risks before final strict schema validation", () => {
    const shortRisk = "A shorter valid risk remains unchanged.";
    const parsed = parseGeminiResponse(JSON.stringify({
      ...geminiAnalysisFixture,
      potentialRisks: [
        `  ${"A".repeat(200)}  `,
        shortRisk,
        `${"B".repeat(159)}!`,
      ],
    }));

    expect(parsed.potentialRisks).toHaveLength(3);
    expect(parsed.potentialRisks[0]).toBe("A".repeat(160));
    expect(parsed.potentialRisks[1]).toBe(shortRisk);
    expect(parsed.potentialRisks[2]).toHaveLength(160);
    expect(parsed.potentialRisks.every((risk) => risk.length <= 160)).toBe(true);
    expect(() => AnalysisResultSchema.parse(parsed)).not.toThrow();
  });
});
