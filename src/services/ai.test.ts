import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_RESPONSE_JSON_SCHEMA,
  GEMINI_THINKING_BUDGET,
  parseGeminiJson,
  parseGeminiResponse,
  VertexAiAnalyzer,
} from "./ai";
import { AnalysisResultSchema, GeminiAnalysisOutputSchema } from "@/domain/schemas";
import { geminiAnalysisFixture, sourceFixture } from "@/test/fixtures";

const { clientConstructor, generateContent } = vi.hoisted(() => ({
  clientConstructor: vi.fn(),
  generateContent: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(options: unknown) {
      clientConstructor(options);
    }
    models = { generateContent };
  },
}));

describe("Gemini response parsing", () => {
  afterEach(() => {
    generateContent.mockReset();
    clientConstructor.mockReset();
    vi.restoreAllMocks();
    delete process.env.GOOGLE_CLOUD_PROJECT;
  });
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
  it("accepts raw JSON, fenced JSON, and BOM-surrounded JSON", () => {
    const raw = JSON.stringify(geminiAnalysisFixture);
    expect(parseGeminiJson(raw)).toEqual(geminiAnalysisFixture);
    expect(parseGeminiJson(`\n\`\`\`json\n${raw}\n\`\`\`\n`)).toEqual(geminiAnalysisFixture);
    expect(parseGeminiJson(`\`\`\`\n${raw}\n\`\`\``)).toEqual(geminiAnalysisFixture);
    expect(parseGeminiJson(`\uFEFF \n${raw}\n`)).toEqual(geminiAnalysisFixture);
  });
  it("rejects prose, invalid JSON, empty responses, and multiple fenced blocks", () => {
    const raw = JSON.stringify(geminiAnalysisFixture);
    for (const invalid of [
      `Here is the result: ${raw}`,
      `${raw}\nDone.`,
      "{\"summary\":\"incomplete\"",
      "{\"summary\":\"trailing\",}",
      "",
      " \uFEFF ",
      `\`\`\`json\n${raw}\n\`\`\`\n\`\`\`json\n${raw}\n\`\`\``,
    ]) {
      expect(() => parseGeminiJson(invalid)).toThrow("malformed JSON");
    }
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
  it("normalizes bounded key points and keeps the first five ordered evidence items", () => {
    const evidence = Array.from({ length: 7 }, (_, index) => ({
      quote: `Exact source excerpt ${index + 1}`,
      significance: `Grounded significance ${index + 1}`,
    }));
    const parsed = parseGeminiResponse(JSON.stringify({
      ...geminiAnalysisFixture,
      keyPoints: [`  ${"K".repeat(200)}  `, "A concise point remains unchanged."],
      evidence,
    }));

    expect(parsed.keyPoints).toEqual(["K".repeat(160), "A concise point remains unchanged."]);
    expect(parsed.evidence).toEqual(evidence.slice(0, 5));
    expect(() => AnalysisResultSchema.parse(parsed)).not.toThrow();
  });
  it("derives a missing non-unique reason only from supplied related-article reasons", () => {
    const relatedPreviousArticles = [{
      sourceRecordId: "previous-1",
      title: "Previous coverage",
      sourceUrl: "https://example.com/previous",
      relation: "near_duplicate" as const,
      reason: "Both articles describe the same product launch and capabilities.",
    }];
    const parsed = parseGeminiResponse(JSON.stringify({
      ...geminiAnalysisFixture,
      duplicateAnalysis: {
        similarityScore: 82,
        classification: "near_duplicate",
        relatedPreviousArticles,
        duplicateReason: null,
      },
    }));

    expect(parsed.duplicateAnalysis.duplicateReason).toBe(relatedPreviousArticles[0].reason);
    expect(() => AnalysisResultSchema.parse(parsed)).not.toThrow();
  });
  it("does not invent duplicate evidence when no related reason was supplied", () => {
    expect(() => parseGeminiResponse(JSON.stringify({
      ...geminiAnalysisFixture,
      duplicateAnalysis: {
        similarityScore: 82,
        classification: "near_duplicate",
        relatedPreviousArticles: [],
        duplicateReason: null,
      },
    }))).toThrow("schema validation");
  });
  it("parses a valid fenced response through the complete Vertex analyzer path", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    generateContent.mockResolvedValue({
      text: `\`\`\`json\n${JSON.stringify({ ...geminiAnalysisFixture, potentialRisks: ["R".repeat(220)] })}\n\`\`\``,
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: "redacted" }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
    });

    const result = await new VertexAiAnalyzer().analyze(sourceFixture);

    expect(generateContent).toHaveBeenCalledOnce();
    expect(result.result.potentialRisks[0]).toHaveLength(160);
    expect(result.result.category).toBe(geminiAnalysisFixture.category);
    expect(result.model).toBe("gemini-2.5-flash");
    expect(result.tokenUsage?.totalTokens).toBe(30);
    expect(clientConstructor).toHaveBeenCalledWith(expect.objectContaining({
      location: "us-central1",
    }));
    expect(generateContent.mock.calls[0][0]).toMatchObject({
      model: "gemini-2.5-flash",
      config: {
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingBudget: GEMINI_THINKING_BUDGET },
        temperature: 0.1,
        responseMimeType: "application/json",
        responseJsonSchema: GEMINI_RESPONSE_JSON_SCHEMA,
      },
    });
  });
  it("rejects MAX_TOKENS before parsing and logs safe truncation metadata", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    generateContent.mockResolvedValue({
      text: "{\"summary\":\"truncated\"",
      candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "not logged" }] } }],
    });

    await expect(new VertexAiAnalyzer().analyze(sourceFixture))
      .rejects.toThrow("Gemini response was truncated after reaching max output tokens.");
    const logged = JSON.parse(String(warn.mock.calls.at(-1)?.[0]));
    expect(logged).toEqual({
      event: "gemini.response_truncated",
      responseLength: 22,
      fenced: false,
      candidateCount: 1,
      partCount: 1,
      finishReason: "MAX_TOKENS",
    });
    expect(JSON.stringify(logged)).not.toMatch(/summary|not logged/i);
  });
  it("still treats incomplete JSON with STOP as malformed JSON", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    generateContent.mockResolvedValue({
      text: "{\"summary\":\"incomplete\"",
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not logged" }] } }],
    });

    await expect(new VertexAiAnalyzer().analyze(sourceFixture)).rejects.toThrow("Gemini returned malformed JSON.");
  });
  it("logs only bounded response metadata when analyzer parsing fails", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    generateContent.mockResolvedValue({
      text: "prose before {\"unsafe\":\"article text\"}",
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not logged" }, { text: "not logged" }] } }],
    });

    await expect(new VertexAiAnalyzer().analyze(sourceFixture)).rejects.toThrow("malformed JSON");
    const logged = JSON.parse(String(warn.mock.calls.at(-1)?.[0]));
    expect(logged).toEqual({
      event: "gemini.response_parse_failed",
      responseLength: 38,
      fenced: false,
      candidateCount: 1,
      partCount: 2,
      finishReason: "STOP",
    });
    expect(JSON.stringify(logged)).not.toMatch(/unsafe|article text|not logged/i);
  });
});
