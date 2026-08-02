export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const GOOGLE_GENAI_SDK_VERSION = "2.13.0";

export type GeminiThinkingMode = "auto" | "disabled" | "budget-zero" | "omit";
export type GeminiCandidateStage = "ga" | "preview" | "experimental" | "unknown";

export interface GeminiRuntimeConfig {
  readonly primaryModel: string;
  readonly fallbackModel: string;
  readonly project: string;
  readonly location: string;
  readonly timeoutMs: number;
  readonly maxOutputTokens: number;
  readonly retryCount: number;
  readonly retryDelayMs: number;
  readonly fallbackEnabled: boolean;
  readonly thinkingMode: GeminiThinkingMode;
  readonly shadowEnabled: boolean;
  readonly shadowModel: string;
  readonly evaluation: GeminiEvaluationConfig;
}

export type GeminiEnvironment = Record<string, string | undefined>;

export interface GeminiEvaluationConfig {
  readonly enabled: boolean;
  readonly candidateModel: string;
  readonly datasetPath: string;
  readonly outputDir: string;
  readonly concurrency: number;
  readonly timeoutMs: number;
  readonly maxCases: number;
  readonly sampleRate: number;
  readonly saveRawOutputs: boolean;
  readonly redactInputs: boolean;
  readonly allowRealCalls: boolean;
  readonly allowedModels: readonly string[];
  readonly candidateStage: GeminiCandidateStage;
  readonly probeLocations: readonly string[];
  readonly probeThinking: boolean;
  readonly hardCaseLimit: number;
  readonly maxRequests: number;
  readonly maxEstimatedInputTokens: number;
  readonly maxEstimatedOutputTokens: number;
  readonly runLabel: string;
  readonly probeSaveResponsePrefix: boolean;
  readonly probeJsonRetry: boolean;
}

function nonEmpty(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} must not be empty.`);
  return trimmed;
}

function integer(
  value: string | undefined,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (value === undefined) return fallback;
  if (!/^-?\d+$/.test(value.trim())) throw new Error(`${name} must be an integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function boolean(value: string | undefined, name: string, fallback: boolean) {
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

function repositoryPath(value: string | undefined, name: string, fallback: string) {
  const selected = value ?? fallback;
  if (!selected.trim()) throw new Error(`${name} must not be empty.`);
  if (/^(?:[a-zA-Z]:[\\/]|[\\/])/.test(selected) || selected.split(/[\\/]+/).includes("..")) {
    throw new Error(`${name} must be a repository-relative path without traversal.`);
  }
  return selected.replaceAll("\\", "/");
}

function decimal(value: string | undefined, name: string, fallback: number, minimumExclusive: number, maximum: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= minimumExclusive || parsed > maximum) {
    throw new Error(`${name} must be greater than ${minimumExclusive} and at most ${maximum}.`);
  }
  return parsed;
}

function commaList(value: string | undefined, name: string, fallback = "") {
  const values = (value ?? fallback).split(",").map((item) => item.trim()).filter(Boolean);
  if (values.some((item) => item.includes("*"))) throw new Error(`${name} does not support wildcards.`);
  return [...new Set(values)];
}

function probeLocations(value: string | undefined) {
  const locations = commaList(value, "GEMINI_EVALUATION_PROBE_LOCATIONS", "us-central1,global");
  if (!locations.length || locations.some((location) => location !== "global" && !/^[a-z][a-z0-9-]{1,62}$/.test(location))) {
    throw new Error("GEMINI_EVALUATION_PROBE_LOCATIONS contains an invalid location.");
  }
  return locations;
}

export function parseGeminiRuntimeConfig(env: GeminiEnvironment = process.env): GeminiRuntimeConfig {
  const primaryModel =
    nonEmpty(env.GEMINI_PRIMARY_MODEL, "GEMINI_PRIMARY_MODEL") ??
    nonEmpty(env.GEMINI_MODEL, "GEMINI_MODEL") ??
    DEFAULT_GEMINI_MODEL;
  const fallbackModel =
    nonEmpty(env.GEMINI_FALLBACK_MODEL, "GEMINI_FALLBACK_MODEL") ?? DEFAULT_GEMINI_MODEL;
  const project = nonEmpty(env.GOOGLE_CLOUD_PROJECT, "GOOGLE_CLOUD_PROJECT");
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is required for Vertex AI.");
  const thinkingMode = env.GEMINI_THINKING_MODE ?? "auto";
  if (!["auto", "disabled", "budget-zero", "omit"].includes(thinkingMode)) {
    throw new Error("GEMINI_THINKING_MODE must be auto, disabled, budget-zero, or omit.");
  }
  const shadowModel = env.GEMINI_SHADOW_MODEL === undefined ? "" : env.GEMINI_SHADOW_MODEL.trim();
  const shadowEnabled = boolean(env.GEMINI_SHADOW_ENABLED, "GEMINI_SHADOW_ENABLED", false);
  if (shadowEnabled && !shadowModel) throw new Error("GEMINI_SHADOW_MODEL is required when shadow mode is enabled.");
  const evaluationEnabled = boolean(env.GEMINI_EVALUATION_ENABLED, "GEMINI_EVALUATION_ENABLED", false);
  const evaluationCandidateModel = env.GEMINI_EVALUATION_CANDIDATE_MODEL?.trim() ?? "";
  const candidateStage = env.GEMINI_EVALUATION_CANDIDATE_STAGE ?? "unknown";
  if (!["ga", "preview", "experimental", "unknown"].includes(candidateStage)) {
    throw new Error("GEMINI_EVALUATION_CANDIDATE_STAGE must be ga, preview, experimental, or unknown.");
  }
  if (evaluationEnabled && !evaluationCandidateModel) {
    throw new Error("GEMINI_EVALUATION_CANDIDATE_MODEL is required when evaluation is enabled.");
  }
  if (evaluationEnabled && evaluationCandidateModel === primaryModel) {
    throw new Error("GEMINI_EVALUATION_CANDIDATE_MODEL must differ from the production model.");
  }

  return Object.freeze({
    primaryModel,
    fallbackModel,
    project,
    location: nonEmpty(env.GOOGLE_CLOUD_LOCATION, "GOOGLE_CLOUD_LOCATION") ?? "us-central1",
    timeoutMs: integer(env.VERTEX_TIMEOUT_MS, "VERTEX_TIMEOUT_MS", 60_000, 1_000, 120_000),
    maxOutputTokens: integer(
      env.GEMINI_MAX_OUTPUT_TOKENS ?? env.GEMINI_MAX_OUTPUT_TOKENS_LEGACY,
      env.GEMINI_MAX_OUTPUT_TOKENS === undefined && env.GEMINI_MAX_OUTPUT_TOKENS_LEGACY !== undefined
        ? "GEMINI_MAX_OUTPUT_TOKENS_LEGACY"
        : "GEMINI_MAX_OUTPUT_TOKENS",
      8_192,
      1_024,
      8_192,
    ),
    retryCount: integer(env.GEMINI_RETRY_COUNT, "GEMINI_RETRY_COUNT", 2, 0, 10),
    retryDelayMs: integer(env.GEMINI_RETRY_DELAY_MS, "GEMINI_RETRY_DELAY_MS", 500, 0, 60_000),
    fallbackEnabled: boolean(env.GEMINI_FALLBACK_ENABLED, "GEMINI_FALLBACK_ENABLED", true),
    thinkingMode: thinkingMode as GeminiThinkingMode,
    shadowEnabled,
    shadowModel,
    evaluation: Object.freeze({
      enabled: evaluationEnabled,
      candidateModel: evaluationCandidateModel,
      datasetPath: repositoryPath(env.GEMINI_EVALUATION_DATASET_PATH, "GEMINI_EVALUATION_DATASET_PATH", "eval/datasets/gemini-migration.json"),
      outputDir: repositoryPath(env.GEMINI_EVALUATION_OUTPUT_DIR, "GEMINI_EVALUATION_OUTPUT_DIR", "eval/results"),
      concurrency: integer(env.GEMINI_EVALUATION_CONCURRENCY, "GEMINI_EVALUATION_CONCURRENCY", 1, 1, 5),
      timeoutMs: integer(env.GEMINI_EVALUATION_TIMEOUT_MS, "GEMINI_EVALUATION_TIMEOUT_MS", 120_000, 1_000, 600_000),
      maxCases: integer(env.GEMINI_EVALUATION_MAX_CASES, "GEMINI_EVALUATION_MAX_CASES", 0, 0, 100_000),
      sampleRate: decimal(env.GEMINI_EVALUATION_SAMPLE_RATE, "GEMINI_EVALUATION_SAMPLE_RATE", 1, 0, 1),
      saveRawOutputs: boolean(env.GEMINI_EVALUATION_SAVE_RAW_OUTPUTS, "GEMINI_EVALUATION_SAVE_RAW_OUTPUTS", false),
      redactInputs: boolean(env.GEMINI_EVALUATION_REDACT_INPUTS, "GEMINI_EVALUATION_REDACT_INPUTS", true),
      allowRealCalls: boolean(env.GEMINI_EVALUATION_ALLOW_REAL_CALLS, "GEMINI_EVALUATION_ALLOW_REAL_CALLS", false),
      allowedModels: Object.freeze(commaList(env.GEMINI_EVALUATION_ALLOWED_MODELS, "GEMINI_EVALUATION_ALLOWED_MODELS")),
      candidateStage: candidateStage as GeminiCandidateStage,
      probeLocations: Object.freeze(probeLocations(env.GEMINI_EVALUATION_PROBE_LOCATIONS)),
      probeThinking: boolean(env.GEMINI_EVALUATION_PROBE_THINKING, "GEMINI_EVALUATION_PROBE_THINKING", false),
      hardCaseLimit: integer(env.GEMINI_EVALUATION_HARD_CASE_LIMIT, "GEMINI_EVALUATION_HARD_CASE_LIMIT", 1, 1, 15),
      maxRequests: integer(env.GEMINI_EVALUATION_MAX_REQUESTS, "GEMINI_EVALUATION_MAX_REQUESTS", 6, 1, 1_000),
      maxEstimatedInputTokens: integer(env.GEMINI_EVALUATION_MAX_ESTIMATED_INPUT_TOKENS, "GEMINI_EVALUATION_MAX_ESTIMATED_INPUT_TOKENS", 20_000, 1, 10_000_000),
      maxEstimatedOutputTokens: integer(env.GEMINI_EVALUATION_MAX_ESTIMATED_OUTPUT_TOKENS, "GEMINI_EVALUATION_MAX_ESTIMATED_OUTPUT_TOKENS", 5_000, 1, 10_000_000),
      runLabel: env.GEMINI_EVALUATION_RUN_LABEL?.trim() ?? "",
      probeSaveResponsePrefix: boolean(env.GEMINI_EVALUATION_PROBE_SAVE_RESPONSE_PREFIX, "GEMINI_EVALUATION_PROBE_SAVE_RESPONSE_PREFIX", true),
      probeJsonRetry: boolean(env.GEMINI_EVALUATION_PROBE_JSON_RETRY, "GEMINI_EVALUATION_PROBE_JSON_RETRY", false),
    }),
  });
}

export function buildThinkingConfig(modelId: string, mode: GeminiThinkingMode) {
  if (mode === "omit" || mode === "disabled") return undefined;
  if (mode === "budget-zero") return { thinkingBudget: 0 } as const;
  return /^gemini-2\.5(?:-|$)/i.test(modelId) ? ({ thinkingBudget: 0 } as const) : undefined;
}
