import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_MAX_CALLS,
  GEMINI_MAX_IDENTICAL_RETRIES,
  GEMINI_MAX_REGENERATIONS,
  GEMINI_RESPONSE_JSON_SCHEMA,
  GEMINI_SCHEMA_VERSION,
  GEMINI_THINKING_BUDGET,
  PROMPT_VERSION,
  normalizeLiveAnalysisOutput,
  parseGeminiJson,
  parseGeminiResponse,
  VertexAiAnalyzer,
} from "./ai";
import { AnalysisResultSchema, GeminiAnalysisOutputSchema } from "@/domain/schemas";
import { geminiAnalysisFixture, sourceFixture } from "@/test/fixtures";
import { AnalysisFailure } from "./failure-recovery";
import {
  LIVE_ANALYSIS_MAX_OUTPUT_TOKENS,
  LIVE_ANALYSIS_RESPONSE_JSON_SCHEMA,
} from "./live-analysis-contract";

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
    delete process.env.AI_RECOVERY_ENABLED;
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
  it("retries truncated live analysis with a compact structured-output request", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const liveOutput = {
      summary: "A concise factual summary based only on supplied source material.",
      category: "model_release",
      relevanceScore: 80,
      impactScore: 75,
      confidenceScore: 70,
      keyClaims: [{ claim: "The source announces a model.", evidenceRefs: ["source-content"] }],
      impactRationale: "The announced model may affect practical AI development.",
      confidenceRationale: "The conclusion is bounded to the supplied source.",
      limitations: ["Independent verification remains necessary."],
      requiresHumanReview: true,
    };
    generateContent
      .mockResolvedValueOnce({
        text: "{\"summary\":\"partial",
        candidates: [{ finishReason: "MAX_TOKENS" }],
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(liveOutput),
        candidates: [{ finishReason: "STOP" }],
      });

    const result = await new VertexAiAnalyzer().analyzeLive({
      intelligenceItemId: "item-1",
      sourceDefinitionId: "source-1",
      sourceName: "Official source",
      sourceTrustLevel: "official",
      articleUrl: "https://example.com/article",
      articleTitle: "Model announcement",
      publicationDate: "2026-07-28",
      content: "The source announces a model with practical developer capabilities.",
      evidenceIdentifiers: ["source-content"],
    });

    expect(result.result).toEqual(liveOutput);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(String(generateContent.mock.calls[1][0].contents)).toContain("TRUNCATION RECOVERY");
    expect(String(generateContent.mock.calls[1][0].contents)).toContain("new complete object, not a continuation or patch");
    expect(generateContent.mock.calls[1][0].config).toMatchObject({
      responseMimeType: "application/json",
      responseJsonSchema: LIVE_ANALYSIS_RESPONSE_JSON_SCHEMA,
      maxOutputTokens: LIVE_ANALYSIS_MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
    });
  });
  it("never parses or returns a live response truncated after the compact retry", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    generateContent.mockResolvedValue({
      text: "{\"summary\":\"partial",
      candidates: [{ finishReason: "MAX_TOKENS" }],
    });

    await expect(new VertexAiAnalyzer().analyzeLive({
      intelligenceItemId: "item-1",
      sourceName: "Official source",
      sourceTrustLevel: "official",
      articleUrl: "https://example.com/article",
      articleTitle: "Model announcement",
      publicationDate: "2026-07-28",
      content: "The source announces a model.",
      evidenceIdentifiers: ["source-content"],
    })).rejects.toThrow("truncated live analysis after compact retry");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
  it("normalizes every bounded live-analysis string before preserving Zod validation", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    const oversized = {
      summary: `  ${"S".repeat(900)}  `,
      category: `  ${"C".repeat(100)}  `,
      relevanceScore: 80,
      impactScore: 75,
      confidenceScore: 70,
      keyClaims: [{
        claim: `  ${"K".repeat(600)}  `,
        evidenceRefs: [`  ${"E".repeat(100)}  `],
      }],
      impactRationale: `  ${"I".repeat(900)}  `,
      confidenceRationale: `  ${"R".repeat(900)}  `,
      limitations: [`  ${"L".repeat(400)}  `],
      requiresHumanReview: true,
    };
    generateContent.mockResolvedValue({
      text: JSON.stringify(oversized),
      candidates: [{ finishReason: "STOP" }],
    });

    const result = await new VertexAiAnalyzer().analyzeLive({
      intelligenceItemId: "item-1",
      sourceName: "Official source",
      sourceTrustLevel: "official",
      articleUrl: "https://example.com/article",
      articleTitle: "Model announcement",
      publicationDate: "2026-07-28",
      content: "The source announces a model.",
      evidenceIdentifiers: ["source-content"],
    });

    expect(result.result.summary).toBe("S".repeat(800));
    expect(result.result.category).toBe("C".repeat(80));
    expect(result.result.keyClaims[0].claim).toBe("K".repeat(500));
    expect(result.result.keyClaims[0].evidenceRefs).toEqual(["E".repeat(80)]);
    expect(result.result.impactRationale).toBe("I".repeat(800));
    expect(result.result.confidenceRationale).toBe("R".repeat(800));
    expect(result.result.limitations).toEqual(["L".repeat(300)]);
  });
  it("normalization preserves arrays, objects, wrong types, and unknown fields for Zod to reject", () => {
    const input = {
      summary: 123,
      keyClaims: [{ claim: "valid", evidenceRefs: ["known"], unknown: "preserved" }],
      limitations: "not-an-array",
      unknown: { nested: ["unchanged"] },
    };
    const normalized = normalizeLiveAnalysisOutput(input);

    expect(normalized).toMatchObject(input);
    expect(normalized).not.toBe(input);
  });
  it("preserves legacy production parsing when recovery is disabled", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    process.env.AI_RECOVERY_ENABLED = "false";
    generateContent.mockResolvedValue({
      text: JSON.stringify({ ...geminiAnalysisFixture, keyPoints: ["K".repeat(200)] }),
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: "redacted" }] } }],
    });

    const result = await new VertexAiAnalyzer().analyze(sourceFixture);
    expect(result.result.keyPoints).toEqual(["K".repeat(160)]);
  });
  it("activates strict lossless recovery only when the feature flag is enabled", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    process.env.AI_RECOVERY_ENABLED = "true";
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    generateContent.mockResolvedValue({
      text: JSON.stringify({ ...geminiAnalysisFixture, keyPoints: ["K".repeat(200)] }),
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: "redacted" }] } }],
    });

    await expect(new VertexAiAnalyzer().analyze(sourceFixture))
      .rejects.toThrow("Gemini output failed schema validation.");
    const event = vi.mocked(console.info).mock.calls.map(([value]) => JSON.parse(String(value)))
      .findLast(({ event }) => event === "gemini.recovery");
    expect(event).toMatchObject({
      event: "gemini.recovery",
      recoveryType: "recovery_exhausted",
      terminalFailureCategory: "schema_validation",
      retryCount: 1,
      regenerationCount: 1,
    });
  });
});

describe("Phase 4.2 bounded Gemini recovery", () => {
  const validResponse = {
    text: JSON.stringify(geminiAnalysisFixture),
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: "redacted" }] } }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
  };
  const providerError = (status: number, retryAfter?: string) => Object.assign(new Error("provider detail must not be logged"), {
    status,
    response: retryAfter ? { headers: { get: () => retryAfter } } : undefined,
  });
  let sleep: ReturnType<typeof vi.fn<(milliseconds: number) => Promise<void>>>;

  function analyzer() {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    process.env.AI_RECOVERY_ENABLED = "true";
    sleep = vi.fn(async () => undefined);
    return new VertexAiAnalyzer({ sleep, now: () => 1_000 });
  }

  function recoveryEvents(info: { mock: { calls: unknown[][] } }): Array<Record<string, unknown>> {
    return info.mock.calls.map(([value]) => JSON.parse(String(value)) as Record<string, unknown>)
      .filter((event) => event.event === "gemini.recovery");
  }

  afterEach(() => {
    generateContent.mockReset();
    clientConstructor.mockReset();
    vi.restoreAllMocks();
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.AI_RECOVERY_ENABLED;
  });

  it("publishes the fixed recovery ceilings as constants", () => {
    expect(GEMINI_MAX_IDENTICAL_RETRIES).toBe(2);
    expect(GEMINI_MAX_REGENERATIONS).toBe(1);
    expect(GEMINI_MAX_CALLS).toBe(4);
    expect(GEMINI_SCHEMA_VERSION).toBe("gemini-analysis-v2");
    expect(PROMPT_VERSION).toBe("radar-decision-intelligence-v3");
  });

  it("uses explicit character-for-character evidence instructions in the base prompt", async () => {
    generateContent.mockResolvedValue(validResponse);
    await analyzer().analyze(sourceFixture);
    const prompt = String(generateContent.mock.calls[0][0].contents);
    expect(prompt).toContain("short contiguous substring copied directly from SOURCE");
    expect(prompt).toContain("character-for-character identical");
    expect(prompt).toContain("Preserve case, punctuation, apostrophes, quotation marks, dashes, and Unicode characters exactly.");
    expect(prompt).toContain("Do not insert ellipses unless those ellipsis characters exist in SOURCE.");
    expect(prompt).toContain("Never paraphrase a quote or assemble it from separate fragments.");
    expect(prompt).toContain("Copy the quote directly from SOURCE. Do not rewrite it from memory.");
    expect(prompt).toContain("Prefer a shorter quote when uncertain.");
    expect(prompt).toContain("Do not include surrounding quotation marks unless those marks exist in SOURCE.");
    expect(prompt).toContain("For any regeneration, return a complete replacement analysis object, never a patch.");
  });

  it("retries a timeout identically and then succeeds", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    generateContent
      .mockRejectedValueOnce(Object.assign(new Error("timeout detail"), { name: "TimeoutError" }))
      .mockResolvedValueOnce(validResponse);
    const result = await analyzer().analyze(sourceFixture);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[1][0]).toBe(generateContent.mock.calls[0][0]);
    expect(sleep).toHaveBeenCalledWith(250);
    expect(result).toMatchObject({ retryCount: 1, regenerationCount: 0 });
    expect(recoveryEvents(info).map((event) => event.recoveryType)).toEqual([
      "provider_retry_started", "provider_retry_completed", "recovery_succeeded",
    ]);
  });

  it("respects Retry-After for HTTP 429 before succeeding", async () => {
    generateContent.mockRejectedValueOnce(providerError(429, "2")).mockResolvedValueOnce(validResponse);
    const result = await analyzer().analyze(sourceFixture);
    expect(sleep).toHaveBeenCalledWith(2_000);
    expect(result.retryCount).toBe(1);
  });

  it("exhausts two identical retries for HTTP 5xx", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    generateContent.mockRejectedValue(providerError(503));
    const failure = await analyzer().analyze(sourceFixture).catch((error): AnalysisFailure => error);
    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([250, 500]);
    expect(failure).toMatchObject({
      category: "provider_transient", retryCount: 2, regenerationCount: 0,
    });
    expect(recoveryEvents(info).at(-1)).toMatchObject({
      recoveryType: "recovery_exhausted",
      attemptNumber: 3,
      retryCount: 2,
      terminalFailureCategory: "provider_transient",
    });
  });

  it.each([401, 403])("does not retry authentication or authorization status %s", async (status) => {
    generateContent.mockRejectedValue(providerError(status));
    const failure = await analyzer().analyze(sourceFixture).catch((error): AnalysisFailure => error) as AnalysisFailure;
    expect(generateContent).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
    expect(failure.category).toBe("provider_permanent");
  });

  it.each([400, 404])("does not retry invalid configuration or model status %s", async (status) => {
    generateContent.mockRejectedValue(providerError(status));
    await expect(analyzer().analyze(sourceFixture)).rejects.toMatchObject({ category: "provider_permanent" });
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("uses one compact regeneration after empty output", async () => {
    generateContent
      .mockResolvedValueOnce({ text: "", candidates: [{ finishReason: "STOP" }] })
      .mockResolvedValueOnce(validResponse);
    const result = await analyzer().analyze(sourceFixture);
    expect(result).toMatchObject({ retryCount: 1, regenerationCount: 1 });
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(String(generateContent.mock.calls[1][0].contents)).toContain("Generate the complete replacement JSON object again");
    expect(String(generateContent.mock.calls[1][0].contents)).toContain("Use concise values");
    expect(generateContent.mock.calls[1][0]).toMatchObject({
      model: generateContent.mock.calls[0][0].model,
      config: generateContent.mock.calls[0][0].config,
    });
    expect(String(generateContent.mock.calls[1][0].contents)
      .startsWith(String(generateContent.mock.calls[0][0].contents))).toBe(true);
  });

  it("never parses MAX_TOKENS output and uses one compact regeneration", async () => {
    generateContent
      .mockResolvedValueOnce({
        text: "{\"unsafe\":\"partial raw output\"",
        candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "not logged" }] } }],
      })
      .mockResolvedValueOnce(validResponse);
    const result = await analyzer().analyze(sourceFixture);
    expect(result.regenerationCount).toBe(1);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("uses correction regeneration for malformed JSON", async () => {
    generateContent.mockResolvedValueOnce({
      text: "{malformed secret output",
      candidates: [{ finishReason: "STOP" }],
    }).mockResolvedValueOnce(validResponse);
    await analyzer().analyze(sourceFixture);
    const correction = String(generateContent.mock.calls[1][0].contents);
    expect(correction).toContain('"category":"response_envelope"');
    expect(correction).not.toContain("malformed secret output");
  });

  it("uses correction regeneration for schema-invalid output with stable issues", async () => {
    generateContent.mockResolvedValueOnce({
      ...validResponse,
      text: JSON.stringify({ ...geminiAnalysisFixture, importanceScore: 101 }),
    }).mockResolvedValueOnce(validResponse);
    await analyzer().analyze(sourceFixture);
    const correction = String(generateContent.mock.calls[1][0].contents);
    expect(correction).toContain('"category":"schema_validation"');
    expect(correction).toContain('"path":"importanceScore"');
    expect(correction).toContain('"code":"too_big"');
  });

  it("uses correction regeneration for evidence-integrity failure", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    generateContent.mockResolvedValueOnce({
      ...validResponse,
      text: JSON.stringify({
        ...geminiAnalysisFixture,
        evidence: [{ quote: "Unsupported secret evidence quote", significance: "Not grounded." }],
      }),
    }).mockResolvedValueOnce(validResponse);
    await analyzer().analyze(sourceFixture);
    const correction = String(generateContent.mock.calls[1][0].contents);
    expect(correction).toContain('"category":"evidence_integrity"');
    expect(correction).toContain('"code":"quote_not_in_source"');
    expect(correction).not.toContain("Unsupported secret evidence quote");
    const guidance = correction.slice(correction.indexOf("EVIDENCE REMEDIATION:"));
    expect(guidance).toContain("one short, contiguous, character-for-character substring copied from SOURCE");
    expect(guidance).toContain("Do not paraphrase, combine fragments, normalize punctuation, or insert ellipses.");
    expect(correction).toContain("Return the entire object, never a patch.");
    expect(guidance).not.toContain(sourceFixture.normalizedText);
    expect(guidance).not.toContain("Unsupported secret evidence quote");

    const event = recoveryEvents(info).find(({ recoveryType }) =>
      recoveryType === "correction_regeneration_requested");
    expect(event?.evidenceMismatchDiagnostics).toEqual([{
      fieldPath: "evidence.0.quote",
      quoteLength: 33,
      longestMatchingPrefixLength: 0,
      longestMatchingSuffixLength: 2,
      mismatchClassification: "absent",
    }]);
    const diagnostics = JSON.stringify(event?.evidenceMismatchDiagnostics);
    expect(diagnostics).not.toMatch(/Unsupported|secret|authoritative|source text/i);
  });

  it("uses correction regeneration for duplicate-integrity failure", async () => {
    const context = { previousArticles: [{
      sourceRecordId: "previous",
      title: "Previous title",
      sourceUrl: "https://cloud.google.com/blog/previous",
      publishedAt: "2026-07-23T00:00:00.000Z",
      summary: "A valid previous summary long enough for deterministic context.",
      keyPoints: ["Previous point"],
      relatedTopics: ["AI"],
      entities: [],
    }] };
    generateContent.mockResolvedValueOnce({
      ...validResponse,
      text: JSON.stringify({
        ...geminiAnalysisFixture,
        duplicateAnalysis: {
          similarityScore: 80,
          classification: "near_duplicate",
          relatedPreviousArticles: [{
            sourceRecordId: "invented",
            title: "Invented reference",
            sourceUrl: "https://example.com/invented",
            relation: "near_duplicate",
            reason: "This reference was not provided in the immutable context.",
          }],
          duplicateReason: "The generated reference is not part of the supplied context.",
        },
      }),
    }).mockResolvedValueOnce(validResponse);
    await analyzer().analyze(sourceFixture, context);
    const correction = String(generateContent.mock.calls[1][0].contents);
    expect(correction).toContain('"category":"duplicate_integrity"');
    expect(correction).toContain('"code":"reference_not_in_context"');
  });

  it("makes a second invalid result terminal without another regeneration", async () => {
    generateContent.mockResolvedValue({
      ...validResponse,
      text: "{invalid",
    });
    const failure = await analyzer().analyze(sourceFixture).catch((error): AnalysisFailure => error) as AnalysisFailure;
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(failure).toMatchObject({
      category: "response_envelope", retryCount: 1, regenerationCount: 1,
    });
  });

  it("never exceeds four calls across regeneration and provider retries", async () => {
    generateContent
      .mockResolvedValueOnce({ ...validResponse, text: "{invalid" })
      .mockRejectedValueOnce(providerError(503))
      .mockRejectedValueOnce(providerError(503))
      .mockRejectedValueOnce(providerError(503))
      .mockResolvedValueOnce(validResponse);
    const failure = await analyzer().analyze(sourceFixture).catch((error): AnalysisFailure => error) as AnalysisFailure;
    expect(generateContent).toHaveBeenCalledTimes(4);
    expect(failure).toMatchObject({
      category: "provider_transient", retryCount: 3, regenerationCount: 1,
    });
  });

  it("keeps source, context, schema, and request identity immutable across retries", async () => {
    const context = { previousArticles: [] };
    generateContent.mockRejectedValueOnce(providerError(503)).mockResolvedValueOnce(validResponse);
    await analyzer().analyze(sourceFixture, context);
    const [first, second] = generateContent.mock.calls.map(([request]) => request);
    expect(second).toBe(first);
    expect(first.config).toMatchObject({
      temperature: 0,
      responseJsonSchema: GEMINI_RESPONSE_JSON_SCHEMA,
    });
    expect(sourceFixture.normalizedText).toBe("This is authoritative source text. ".repeat(20));
    expect(context).toEqual({ previousArticles: [] });
  });

  it("keeps legacy provider failures single-call when recovery is disabled", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    process.env.AI_RECOVERY_ENABLED = "false";
    generateContent.mockRejectedValue(providerError(503));
    await expect(new VertexAiAnalyzer({ sleep: vi.fn() }).analyze(sourceFixture))
      .rejects.toThrow("provider detail must not be logged");
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("never includes raw output, article text, evidence, prompts, or provider prose in telemetry", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    generateContent.mockResolvedValue({
      text: "raw invalid secret Gemini output",
      candidates: [{ finishReason: "STOP" }],
    });
    await analyzer().analyze(sourceFixture).catch(() => undefined);
    const serialized = JSON.stringify(recoveryEvents(info));
    expect(serialized).not.toMatch(/raw invalid|authoritative source text|evidence quote|provider detail|prompt body|credential|token|secret/i);
    expect(recoveryEvents(info).every((event) =>
      event.model === "gemini-2.5-flash"
      && event.promptVersion === "radar-decision-intelligence-v3"
      && event.schemaVersion === GEMINI_SCHEMA_VERSION
      && event.recoveryEnabled === true)).toBe(true);
  });
});
