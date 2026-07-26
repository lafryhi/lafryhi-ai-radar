import { describe, expect, it } from "vitest";
import { z } from "zod";
import { GEMINI_RESPONSE_JSON_SCHEMA, parseGeminiResponse } from "./ai";
import { AnalysisResultSchema, GeminiAnalysisOutputSchema } from "@/domain/schemas";
import { geminiAnalysisFixture } from "@/test/fixtures";

describe("Gemini response parsing", () => {
  it("provides every required analysis field in the structural Vertex schema", () => {
    expect(GEMINI_RESPONSE_JSON_SCHEMA).toMatchObject({
      type: "object",
      required: expect.arrayContaining(["summary", "keyPoints", "importanceScore", "noveltyScore", "overallRecommendation", "entities", "duplicateAnalysis"]),
    });
    expect(new Set(GEMINI_RESPONSE_JSON_SCHEMA.required)).toEqual(new Set(Object.keys(geminiAnalysisFixture)));
    expect(GEMINI_RESPONSE_JSON_SCHEMA.properties.entities.items.required).toEqual(["name", "normalizedName", "type"]);
    expect(GEMINI_RESPONSE_JSON_SCHEMA.properties.duplicateAnalysis.required).toEqual([
      "similarityScore", "classification", "relatedPreviousArticles", "duplicateReason",
    ]);
  });
  it("keeps service-side schema structural instead of sending local validation constraints", () => {
    const generatedFromStrictZod = JSON.stringify(z.toJSONSchema(GeminiAnalysisOutputSchema));
    const serialized = JSON.stringify(GEMINI_RESPONSE_JSON_SCHEMA);
    expect(generatedFromStrictZod).toContain('"maxLength"');
    expect(generatedFromStrictZod).toContain('"maxItems"');
    expect(generatedFromStrictZod).toContain('"minimum"');
    expect(generatedFromStrictZod).toContain('"anyOf"');
    for (const keyword of [
      "anyOf", "oneOf", "allOf", "pattern", "format", "minLength", "maxLength",
      "minItems", "maxItems", "minimum", "maximum",
    ]) {
      expect(serialized).not.toContain(`"${keyword}"`);
    }
    expect(serialized).toContain('"enum"');
  });
  it("rejects malformed JSON", () => expect(() => parseGeminiResponse("{bad")).toThrow("malformed JSON"));
  it("rejects schema-invalid JSON", () => expect(() => parseGeminiResponse(JSON.stringify({ summary: "missing fields" }))).toThrow("schema validation"));
  it("rejects missing fields, wrong types, and invalid protected enums locally", () => {
    const missingSummary: Partial<typeof geminiAnalysisFixture> = { ...geminiAnalysisFixture };
    delete missingSummary.summary;
    expect(() => parseGeminiResponse(JSON.stringify(missingSummary))).toThrow("schema validation");
    expect(() => parseGeminiResponse(JSON.stringify({ ...geminiAnalysisFixture, importanceScore: "high" }))).toThrow("schema validation");
    expect(() => parseGeminiResponse(JSON.stringify({ ...geminiAnalysisFixture, category: "unsupported" }))).toThrow("schema validation");
    expect(() => parseGeminiResponse(JSON.stringify({
      ...geminiAnalysisFixture,
      entities: [{ ...geminiAnalysisFixture.entities[0], type: "unsupported" }],
    }))).toThrow("schema validation");
  });
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
