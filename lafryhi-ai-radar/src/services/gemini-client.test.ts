import type { GenerateContentResponse } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import {
  classifyGeminiError,
  ControlledGeminiClient,
  normalizeGeminiResponseMetadata,
} from "./gemini-client";
import { parseGeminiRuntimeConfig } from "./gemini-runtime-config";

const response = (text = '{"status":"ok"}') => ({
  text,
  modelVersion: "version-1",
  usageMetadata: { promptTokenCount: 4 },
  candidates: [{ finishReason: "STOP", safetyRatings: [{ category: "SAFE" }] }],
}) as unknown as GenerateContentResponse;

function config(overrides: Record<string, string | undefined> = {}) {
  return parseGeminiRuntimeConfig({
    GOOGLE_CLOUD_PROJECT: "test-project",
    GEMINI_PRIMARY_MODEL: "primary-model",
    GEMINI_FALLBACK_MODEL: "fallback-model",
    GEMINI_RETRY_DELAY_MS: "10",
    ...overrides,
  });
}

const request = {
  contents: "safe test",
  config: { responseMimeType: "application/json", responseJsonSchema: { type: "object" } },
};

describe("Gemini error classification", () => {
  it.each([408, 429, 500, 502, 503, 504])("classifies HTTP %s as transient", (status) => {
    expect(classifyGeminiError({ status })).toBe("transient");
  });
  it("classifies network transients and model availability", () => {
    expect(classifyGeminiError(new Error("ECONNRESET"))).toBe("transient");
    expect(classifyGeminiError({ status: 404 })).toBe("model-availability");
  });
  it.each([400, 401, 403, 422])("does not classify permanent HTTP %s as transient", (status) => {
    expect(classifyGeminiError({ status })).not.toBe("transient");
  });
});

describe("controlled Gemini generation", () => {
  it("returns a successful primary response with normalized metadata", async () => {
    const generate = vi.fn().mockResolvedValue(response());
    const result = await new ControlledGeminiClient(config(), { generate }).generateContent(request);
    expect(result).toMatchObject({
      requestedModel: "primary-model",
      actualModel: "primary-model",
      fallbackUsed: false,
      attempts: 1,
      metadata: { modelVersion: "version-1", finishReason: "STOP", candidateCount: 1 },
      shadow: { enabled: false, attempted: false },
    });
    expect(generate.mock.calls[0][0].config.thinkingConfig).toBeUndefined();
  });

  it("retries transient failures with exponential backoff", async () => {
    const generate = vi.fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue(response());
    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await new ControlledGeminiClient(config(), { generate, sleep }).generateContent(request);
    expect(result.attempts).toBe(3);
    expect(sleep.mock.calls).toEqual([[10], [20]]);
  });

  it("uses fallback after exhausted transient failures", async () => {
    const generate = vi.fn(async ({ model }: { model: string }) => {
      if (model === "primary-model") throw { status: 503 };
      return response();
    });
    const result = await new ControlledGeminiClient(config({ GEMINI_RETRY_COUNT: "1" }), {
      generate,
      sleep: async () => {},
    }).generateContent(request);
    expect(result).toMatchObject({ actualModel: "fallback-model", fallbackUsed: true, attempts: 3 });
  });

  it("does not fallback when disabled or when models are identical", async () => {
    const generate = vi.fn().mockRejectedValue({ status: 503 });
    await expect(new ControlledGeminiClient(config({ GEMINI_FALLBACK_ENABLED: "false", GEMINI_RETRY_COUNT: "0" }), {
      generate,
    }).generateContent(request)).rejects.toMatchObject({ status: 503 });
    await expect(new ControlledGeminiClient(config({
      GEMINI_FALLBACK_MODEL: "primary-model",
      GEMINI_RETRY_COUNT: "0",
    }), { generate }).generateContent(request)).rejects.toMatchObject({ status: 503 });
  });

  it("does not retry or fallback authentication failures", async () => {
    const generate = vi.fn().mockRejectedValue({ status: 401 });
    await expect(new ControlledGeminiClient(config(), { generate }).generateContent(request))
      .rejects.toMatchObject({ status: 401 });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("normalizes optional response metadata safely", () => {
    expect(normalizeGeminiResponseMetadata({ candidates: [] } as unknown as GenerateContentResponse))
      .toEqual({ candidateCount: 0 });
  });

  it("does not run shadow by default and isolates enabled shadow failure", async () => {
    const generate = vi.fn().mockResolvedValue(response("production"));
    const shadowGenerate = vi.fn().mockRejectedValue(new Error("shadow failed"));
    const disabled = await new ControlledGeminiClient(config(), { generate, shadowGenerate }).generateContent(request);
    expect(disabled.shadow.attempted).toBe(false);
    expect(shadowGenerate).not.toHaveBeenCalled();

    const enabled = await new ControlledGeminiClient(config({
      GEMINI_SHADOW_ENABLED: "true",
      GEMINI_SHADOW_MODEL: "candidate-model",
    }), { generate, shadowGenerate }).generateContent(request);
    expect(enabled.response.text).toBe("production");
    expect(enabled.shadow).toMatchObject({
      enabled: true,
      attempted: true,
      model: "candidate-model",
      succeeded: false,
    });
  });

  it("samples shadow execution without affecting production output", async () => {
    const generate = vi.fn().mockResolvedValue(response("production"));
    const shadowGenerate = vi.fn().mockResolvedValue(response("candidate"));
    const client = new ControlledGeminiClient(config({
      GEMINI_SHADOW_ENABLED: "true",
      GEMINI_SHADOW_MODEL: "candidate-model",
      GEMINI_EVALUATION_SAMPLE_RATE: "0.5",
    }), { generate, shadowGenerate, shadowSampler: () => 0.8 });
    const result = await client.generateContent(request);
    expect(result.response.text).toBe("production");
    expect(result.shadow).toMatchObject({ enabled: true, attempted: false, model: "candidate-model" });
    expect(shadowGenerate).not.toHaveBeenCalled();
  });
});
