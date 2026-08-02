import { describe, expect, it } from "vitest";
import {
  buildThinkingConfig,
  parseGeminiRuntimeConfig,
} from "./gemini-runtime-config";

const base = { GOOGLE_CLOUD_PROJECT: "test-project" };

describe("Gemini runtime configuration", () => {
  it("uses stable defaults and returns an immutable object", () => {
    const config = parseGeminiRuntimeConfig(base);
    expect(config).toMatchObject({
      primaryModel: "gemini-2.5-flash",
      fallbackModel: "gemini-2.5-flash",
      location: "us-central1",
      timeoutMs: 60_000,
      maxOutputTokens: 8_192,
      retryCount: 2,
      retryDelayMs: 500,
      fallbackEnabled: true,
      thinkingMode: "auto",
      shadowEnabled: false,
      shadowModel: "",
      evaluation: {
        enabled: false,
        candidateModel: "",
        datasetPath: "eval/datasets/gemini-migration.json",
        outputDir: "eval/results",
        concurrency: 1,
        timeoutMs: 120_000,
        maxCases: 0,
        sampleRate: 1,
        saveRawOutputs: false,
        redactInputs: true,
        allowRealCalls: false,
        allowedModels: [],
        candidateStage: "unknown",
        probeLocations: ["us-central1", "global"],
        probeThinking: false,
        hardCaseLimit: 1,
        maxRequests: 6,
        maxEstimatedInputTokens: 20_000,
        maxEstimatedOutputTokens: 5_000,
        runLabel: "",
        probeSaveResponsePrefix: true,
        probeJsonRetry: false,
      },
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("gives the primary variable precedence and supports the legacy model variable", () => {
    expect(parseGeminiRuntimeConfig({ ...base, GEMINI_MODEL: "legacy-model" }).primaryModel).toBe("legacy-model");
    expect(parseGeminiRuntimeConfig({
      ...base,
      GEMINI_MODEL: "legacy-model",
      GEMINI_PRIMARY_MODEL: "primary-model",
    }).primaryModel).toBe("primary-model");
  });

  it("supports the legacy output-token variable with new-variable precedence", () => {
    expect(parseGeminiRuntimeConfig({ ...base, GEMINI_MAX_OUTPUT_TOKENS_LEGACY: "4096" }).maxOutputTokens).toBe(4096);
    expect(parseGeminiRuntimeConfig({
      ...base,
      GEMINI_MAX_OUTPUT_TOKENS_LEGACY: "4096",
      GEMINI_MAX_OUTPUT_TOKENS: "8192",
    }).maxOutputTokens).toBe(8192);
  });

  it.each([
    ["GEMINI_PRIMARY_MODEL", ""],
    ["GEMINI_FALLBACK_MODEL", " "],
    ["GOOGLE_CLOUD_LOCATION", ""],
    ["VERTEX_TIMEOUT_MS", "abc"],
    ["GEMINI_MAX_OUTPUT_TOKENS", "-1"],
    ["GEMINI_RETRY_COUNT", "-1"],
    ["GEMINI_RETRY_DELAY_MS", "1.5"],
    ["GEMINI_FALLBACK_ENABLED", "yes"],
    ["GEMINI_SHADOW_ENABLED", "0"],
    ["GEMINI_THINKING_MODE", "maximum"],
  ])("rejects invalid %s values", (name, value) => {
    expect(() => parseGeminiRuntimeConfig({ ...base, [name]: value })).toThrow(name);
  });

  it("requires a non-empty project", () => {
    expect(() => parseGeminiRuntimeConfig({})).toThrow("GOOGLE_CLOUD_PROJECT");
    expect(() => parseGeminiRuntimeConfig({ GOOGLE_CLOUD_PROJECT: "" })).toThrow("GOOGLE_CLOUD_PROJECT");
  });

  it("parses supported booleans", () => {
    expect(parseGeminiRuntimeConfig({
      ...base,
      GEMINI_FALLBACK_ENABLED: "false",
      GEMINI_SHADOW_ENABLED: "true",
      GEMINI_SHADOW_MODEL: "candidate-model",
    })).toMatchObject({ fallbackEnabled: false, shadowEnabled: true });
  });

  it("requires a distinct candidate only when evaluation is enabled", () => {
    expect(() => parseGeminiRuntimeConfig({
      ...base,
      GEMINI_EVALUATION_ENABLED: "true",
    })).toThrow("GEMINI_EVALUATION_CANDIDATE_MODEL");
    expect(() => parseGeminiRuntimeConfig({
      ...base,
      GEMINI_EVALUATION_ENABLED: "true",
      GEMINI_EVALUATION_CANDIDATE_MODEL: "gemini-2.5-flash",
    })).toThrow("must differ");
    expect(parseGeminiRuntimeConfig({
      ...base,
      GEMINI_EVALUATION_ENABLED: "true",
      GEMINI_EVALUATION_CANDIDATE_MODEL: "candidate-model",
    }).evaluation.enabled).toBe(true);
  });

  it.each([
    ["GEMINI_EVALUATION_DATASET_PATH", "../private.json"],
    ["GEMINI_EVALUATION_OUTPUT_DIR", "C:\\temp"],
    ["GEMINI_EVALUATION_CONCURRENCY", "6"],
    ["GEMINI_EVALUATION_SAMPLE_RATE", "0"],
    ["GEMINI_EVALUATION_SAMPLE_RATE", "1.1"],
    ["GEMINI_EVALUATION_MAX_CASES", "-1"],
  ])("rejects unsafe evaluation setting %s=%s", (name, value) => {
    expect(() => parseGeminiRuntimeConfig({ ...base, [name]: value })).toThrow(name);
  });

  it("parses and deduplicates exact probe locations and allowlisted models", () => {
    const config = parseGeminiRuntimeConfig({
      ...base,
      GEMINI_EVALUATION_PROBE_LOCATIONS: "us-central1,global,us-central1",
      GEMINI_EVALUATION_ALLOWED_MODELS: "candidate-a,candidate-b,candidate-a",
      GEMINI_EVALUATION_CANDIDATE_STAGE: "preview",
    });
    expect(config.evaluation.probeLocations).toEqual(["us-central1", "global"]);
    expect(config.evaluation.allowedModels).toEqual(["candidate-a", "candidate-b"]);
    expect(config.evaluation.candidateStage).toBe("preview");
  });

  it.each([
    ["GEMINI_EVALUATION_PROBE_LOCATIONS", "US CENTRAL"],
    ["GEMINI_EVALUATION_ALLOWED_MODELS", "gemini-*"],
    ["GEMINI_EVALUATION_CANDIDATE_STAGE", "stable"],
    ["GEMINI_EVALUATION_HARD_CASE_LIMIT", "16"],
    ["GEMINI_EVALUATION_ALLOW_REAL_CALLS", "yes"],
  ])("rejects invalid probe configuration %s=%s", (name, value) => {
    expect(() => parseGeminiRuntimeConfig({ ...base, [name]: value })).toThrow(name);
  });
});

describe("model-aware thinking configuration", () => {
  it("uses budget zero automatically only for Gemini 2.5", () => {
    expect(buildThinkingConfig("gemini-2.5-flash", "auto")).toEqual({ thinkingBudget: 0 });
    expect(buildThinkingConfig("gemini-new-model", "auto")).toBeUndefined();
  });

  it("honors explicit omit, disabled, and budget-zero modes", () => {
    expect(buildThinkingConfig("gemini-2.5-flash", "omit")).toBeUndefined();
    expect(buildThinkingConfig("gemini-2.5-flash", "disabled")).toBeUndefined();
    expect(buildThinkingConfig("gemini-new-model", "budget-zero")).toEqual({ thinkingBudget: 0 });
  });
});
