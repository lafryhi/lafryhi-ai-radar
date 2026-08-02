import {
  GoogleGenAI,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";
import {
  buildThinkingConfig,
  parseGeminiRuntimeConfig,
  type GeminiRuntimeConfig,
} from "./gemini-runtime-config";

export interface NormalizedGeminiResponseMetadata {
  modelVersion?: string;
  usageMetadata?: unknown;
  finishReason?: string;
  safetyInformation?: unknown;
  candidateCount: number;
}

export interface GeminiShadowMetadata {
  enabled: boolean;
  attempted: boolean;
  model?: string;
  succeeded?: boolean;
  durationMs?: number;
  errorType?: string;
}

export interface GeminiGenerationResult {
  response: GenerateContentResponse;
  requestedModel: string;
  actualModel: string;
  fallbackUsed: boolean;
  attempts: number;
  durationMs: number;
  metadata: NormalizedGeminiResponseMetadata;
  shadow: GeminiShadowMetadata;
}

type Generate = (parameters: GenerateContentParameters) => Promise<GenerateContentResponse>;

export interface GeminiClientDependencies {
  generate?: Generate;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  shadowGenerate?: Generate;
  shadowSampler?: () => number;
  beforeRequest?: () => void;
}

type ErrorClassification = "transient" | "model-availability" | "auth" | "permanent";

class ModelAttemptFailure {
  constructor(readonly cause: unknown, readonly attempts: number) {}
}

function errorStatus(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  for (const value of [candidate.status, candidate.statusCode, candidate.code]) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isInteger(parsed)) return parsed;
  }
  return undefined;
}

export function classifyGeminiError(error: unknown): ErrorClassification {
  const status = errorStatus(error);
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (status === 401 || status === 403 || /\b(authentication|authorization|unauthorized|permission denied)\b/.test(message)) return "auth";
  if (status === 404 || /\b(model not found|model unavailable|not available in (?:this )?location)\b/.test(message)) return "model-availability";
  if ([408, 429, 500, 502, 503, 504].includes(status ?? -1)) return "transient";
  if (/\b(econnreset|connection reset|etimedout|network timeout|temporar(?:y|ily) unavailable|service unavailable)\b/.test(message)) return "transient";
  return "permanent";
}

export function normalizeGeminiResponseMetadata(response: GenerateContentResponse): NormalizedGeminiResponseMetadata {
  const candidates = response.candidates ?? [];
  const first = candidates[0];
  return {
    ...(response.modelVersion ? { modelVersion: response.modelVersion } : {}),
    ...(response.usageMetadata ? { usageMetadata: response.usageMetadata } : {}),
    ...(first?.finishReason ? { finishReason: String(first.finishReason) } : {}),
    ...(first?.safetyRatings ? { safetyInformation: first.safetyRatings } : {}),
    candidateCount: candidates.length,
  };
}

const defaultSleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class ControlledGeminiClient {
  readonly config: GeminiRuntimeConfig;
  private readonly generate: Generate;
  private readonly shadowGenerate: Generate;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly now: () => number;
  private readonly shadowSampler: () => number;
  private readonly beforeRequest: () => void;

  constructor(config = parseGeminiRuntimeConfig(), dependencies: GeminiClientDependencies = {}) {
    this.config = config;
    const client = dependencies.generate
      ? undefined
      : new GoogleGenAI({
          vertexai: true,
          project: config.project,
          location: config.location,
          httpOptions: { timeout: config.timeoutMs },
        });
    this.generate = dependencies.generate ?? ((parameters) => client!.models.generateContent(parameters));
    this.shadowGenerate = dependencies.shadowGenerate ?? this.generate;
    this.sleep = dependencies.sleep ?? defaultSleep;
    this.now = dependencies.now ?? Date.now;
    this.shadowSampler = dependencies.shadowSampler ?? Math.random;
    this.beforeRequest = dependencies.beforeRequest ?? (() => undefined);
  }

  private parameters(parameters: Omit<GenerateContentParameters, "model">, model: string): GenerateContentParameters {
    const thinkingConfig = buildThinkingConfig(model, this.config.thinkingMode);
    return {
      ...parameters,
      model,
      config: {
        ...parameters.config,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    };
  }

  private async attemptModel(
    model: string,
    parameters: Omit<GenerateContentParameters, "model">,
  ): Promise<{ response: GenerateContentResponse; attempts: number }> {
    let attempts = 0;
    while (true) {
      attempts += 1;
      try {
        this.beforeRequest();
        return { response: await this.generate(this.parameters(parameters, model)), attempts };
      } catch (error) {
        if (classifyGeminiError(error) !== "transient" || attempts > this.config.retryCount) {
          throw new ModelAttemptFailure(error, attempts);
        }
        await this.sleep(this.config.retryDelayMs * (2 ** (attempts - 1)));
      }
    }
  }

  private async executeShadow(parameters: Omit<GenerateContentParameters, "model">): Promise<GeminiShadowMetadata> {
    if (!this.config.shadowEnabled) return { enabled: false, attempted: false };
    if (!this.config.shadowModel) return { enabled: true, attempted: false };
    if (this.shadowSampler() >= this.config.evaluation.sampleRate) {
      return { enabled: true, attempted: false, model: this.config.shadowModel };
    }
    const startedAt = this.now();
    try {
      this.beforeRequest();
      await this.shadowGenerate(this.parameters(parameters, this.config.shadowModel));
      return {
        enabled: true,
        attempted: true,
        model: this.config.shadowModel,
        succeeded: true,
        durationMs: this.now() - startedAt,
      };
    } catch (error) {
      return {
        enabled: true,
        attempted: true,
        model: this.config.shadowModel,
        succeeded: false,
        durationMs: this.now() - startedAt,
        errorType: error instanceof Error ? error.name : "UnknownError",
      };
    }
  }

  async generateContent(
    parameters: Omit<GenerateContentParameters, "model">,
    requestedModel = this.config.primaryModel,
  ): Promise<GeminiGenerationResult> {
    const startedAt = this.now();
    let primaryAttempts = 0;
    try {
      const primary = await this.attemptModel(requestedModel, parameters);
      primaryAttempts = primary.attempts;
      return {
        response: primary.response,
        requestedModel,
        actualModel: requestedModel,
        fallbackUsed: false,
        attempts: primaryAttempts,
        durationMs: this.now() - startedAt,
        metadata: normalizeGeminiResponseMetadata(primary.response),
        shadow: await this.executeShadow(parameters),
      };
    } catch (failure) {
      const attempted = failure instanceof ModelAttemptFailure ? failure : new ModelAttemptFailure(failure, 1);
      const error = attempted.cause;
      const classification = classifyGeminiError(error);
      primaryAttempts = attempted.attempts;
      const mayFallback = classification === "transient" || classification === "model-availability";
      if (
        !mayFallback ||
        !this.config.fallbackEnabled ||
        !this.config.fallbackModel ||
        this.config.fallbackModel === requestedModel
      ) throw error;
      let fallback;
      try {
        fallback = await this.attemptModel(this.config.fallbackModel, parameters);
      } catch (fallbackFailure) {
        throw fallbackFailure instanceof ModelAttemptFailure ? fallbackFailure.cause : fallbackFailure;
      }
      return {
        response: fallback.response,
        requestedModel,
        actualModel: this.config.fallbackModel,
        fallbackUsed: true,
        attempts: primaryAttempts + fallback.attempts,
        durationMs: this.now() - startedAt,
        metadata: normalizeGeminiResponseMetadata(fallback.response),
        shadow: await this.executeShadow(parameters),
      };
    }
  }
}
