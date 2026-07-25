import { describe, expect, it } from "vitest";
import { GEMINI_RESPONSE_JSON_SCHEMA, parseGeminiResponse } from "./ai";
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
});
