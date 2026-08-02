import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { buildThinkingConfig, type GeminiThinkingMode } from "../gemini-runtime-config";
import { classifyGeminiError, normalizeGeminiResponseMetadata } from "../gemini-client";
import { sanitizeError } from "./redaction";

export type ProbeTransportStatus =
  | "NOT_ATTEMPTED" | "REACHABLE" | "AUTHENTICATION_FAILED" | "AUTHORIZATION_FAILED"
  | "MODEL_NOT_FOUND" | "TIMEOUT" | "TRANSIENT_FAILURE" | "PERMANENT_FAILURE";
export type ProbeContractStatus =
  | "NOT_TESTED" | "VALID" | "NON_JSON_RESPONSE" | "JSON_PARSE_FAILED" | "SCHEMA_INVALID"
  | "EMPTY_RESPONSE" | "SAFETY_BLOCKED" | "FINISH_REASON_INVALID" | "UNSUPPORTED";
export type ProbeAvailabilityStatus =
  | "AVAILABLE_AND_COMPATIBLE" | "AVAILABLE_CONTRACT_INCOMPATIBLE" | "UNAVAILABLE" | "UNKNOWN";
export type ProbeResponseShape =
  | "RAW_JSON" | "MARKDOWN_FENCED_JSON" | "PROSE_WRAPPED_JSON" | "NON_JSON_TEXT" | "EMPTY";

export interface ProbeRequestConfiguration {
  responseMimeTypeIncluded: true;
  responseJsonSchemaIncluded: true;
  responseSchemaIncluded: false;
  temperature: 0;
  maxOutputTokens: 128;
  thinkingConfig: "OMITTED" | "INCLUDED";
  apiVersion: "v1";
  vertexAiMode: true;
  location: string;
}

export interface StructuredProbeDiagnostic {
  attempted: boolean;
  endpointReachable: boolean;
  modelReachable: boolean;
  requestAccepted: boolean;
  responseReceived: boolean;
  jsonParseValid: boolean;
  schemaValid: boolean;
  structuredOutputSupported: boolean;
  transportStatus: ProbeTransportStatus;
  contractStatus: ProbeContractStatus;
  availabilityStatus: ProbeAvailabilityStatus;
  responseShape: ProbeResponseShape;
  diagnosticJsonExtracted: boolean;
  responsePrefix?: string;
  responseLength: number;
  contentType?: string;
  candidateCount: number;
  finishReason?: string;
  actualModel?: string;
  modelVersion?: string;
  usageMetadata?: unknown;
  durationMs: number;
  attempts: number;
  errorCategory?: string;
  sanitizedError?: string;
  requestConfiguration: ProbeRequestConfiguration;
}

export interface CandidateAvailabilityProbeInput {
  projectId: string;
  location: string;
  candidateModel: string;
  timeoutMs: number;
  dryRun: boolean;
  probeThinking?: boolean;
  thinkingMode?: GeminiThinkingMode;
  saveResponsePrefix?: boolean;
  jsonRetry?: boolean;
  requestBudget?: number;
}

export interface CandidateAvailabilityResult {
  candidateModel: string;
  projectConfigured: boolean;
  location: string;
  endpointReachable: boolean;
  modelReachable: boolean;
  requestAccepted: boolean;
  responseReceived: boolean;
  jsonParseValid: boolean;
  schemaValid: boolean;
  structuredOutputSupported: boolean;
  thinkingConfigurationSupported: boolean | null;
  transportStatus: ProbeTransportStatus;
  contractStatus: ProbeContractStatus;
  availabilityStatus: ProbeAvailabilityStatus;
  actualModel?: string;
  modelVersion?: string;
  durationMs: number;
  attempts: number;
  finishReason?: string;
  usageMetadata?: unknown;
  errorCategory?: string;
  sanitizedError?: string;
  checkedAt: string;
  primaryStructuredProbe: StructuredProbeDiagnostic;
  strictPromptRetryProbe: StructuredProbeDiagnostic;
}

type Generate = (parameters: GenerateContentParameters) => Promise<GenerateContentResponse>;
export interface AvailabilityProbeDependencies {
  generate?: Generate;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
}

const RESPONSE_SCHEMA = (model: string) => ({
  type: "object",
  additionalProperties: false,
  required: ["status", "candidate"],
  properties: {
    status: { type: "string", enum: ["ok"] },
    candidate: { type: "string", enum: [model] },
  },
});

function request(
  model: string,
  location: string,
  strictPrompt: boolean,
  thinkingConfig?: { thinkingBudget: number },
): { parameters: GenerateContentParameters; configuration: ProbeRequestConfiguration } {
  return {
    parameters: {
      model,
      contents: strictPrompt
        ? `Return only the JSON object. Do not include Markdown, code fences, explanations, or introductory text. The candidate value must be ${model}.`
        : `Return only a JSON acknowledgement for candidate ${model}.`,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA(model),
        temperature: 0,
        maxOutputTokens: 128,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    },
    configuration: {
      responseMimeTypeIncluded: true,
      responseJsonSchemaIncluded: true,
      responseSchemaIncluded: false,
      temperature: 0,
      maxOutputTokens: 128,
      thinkingConfig: thinkingConfig ? "INCLUDED" : "OMITTED",
      apiVersion: "v1",
      vertexAiMode: true,
      location,
    },
  };
}

function probeErrorCategory(error: unknown) {
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown; message?: unknown };
  const status = Number(candidate?.status ?? candidate?.statusCode ?? candidate?.code);
  const message = error instanceof Error ? error.message.toLowerCase() : String(candidate?.message ?? error).toLowerCase();
  if (status === 401) return "authentication";
  if (status === 403) return "authorization";
  if (/unsupported (?:model|configuration)|not supported/.test(message)) return "unsupported-model";
  if (status === 404 || /model (?:not found|unavailable)/.test(message)) return "model-availability";
  if (status === 408 || /timeout|timed out|etimedout/.test(message)) return "timeout";
  return classifyGeminiError(error);
}

function transportStatus(category: string): ProbeTransportStatus {
  if (category === "authentication") return "AUTHENTICATION_FAILED";
  if (category === "authorization") return "AUTHORIZATION_FAILED";
  if (category === "model-availability") return "MODEL_NOT_FOUND";
  if (category === "timeout") return "TIMEOUT";
  if (category === "transient") return "TRANSIENT_FAILURE";
  return "PERMANENT_FAILURE";
}

function sanitizedPrefix(text: string) {
  return sanitizeError(text.replace(/[\r\n\t]+/g, " ").trim()).slice(0, 120);
}

function responseShape(text: string): { shape: ProbeResponseShape; diagnosticJsonExtracted: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { shape: "EMPTY", diagnosticJsonExtracted: false };
  try {
    JSON.parse(trimmed);
    return { shape: "RAW_JSON", diagnosticJsonExtracted: true };
  } catch {}
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { JSON.parse(fenced[1].trim()); return { shape: "MARKDOWN_FENCED_JSON", diagnosticJsonExtracted: true }; } catch {}
  }
  if ((trimmed.startsWith("{") && !trimmed.includes("}")) || (trimmed.startsWith("[") && !trimmed.includes("]"))) {
    return { shape: "RAW_JSON", diagnosticJsonExtracted: false };
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      JSON.parse(trimmed.slice(first, last + 1));
      return { shape: "PROSE_WRAPPED_JSON", diagnosticJsonExtracted: true };
    } catch {
      return { shape: first === 0 ? "RAW_JSON" : "NON_JSON_TEXT", diagnosticJsonExtracted: false };
    }
  }
  return { shape: "NON_JSON_TEXT", diagnosticJsonExtracted: false };
}

function contentType(response: GenerateContentResponse) {
  const raw = response as unknown as { sdkHttpResponse?: { headers?: Record<string, string> | Headers } };
  const headers = raw.sdkHttpResponse?.headers;
  if (!headers) return undefined;
  return headers instanceof Headers ? headers.get("content-type") ?? undefined : headers["content-type"];
}

async function generateWithOneTransientRetry(
  generate: Generate,
  parameters: GenerateContentParameters,
  sleep: (ms: number) => Promise<void>,
) {
  let attempts = 0;
  while (attempts < 2) {
    attempts += 1;
    try { return { response: await generate(parameters), attempts }; } catch (error) {
      if (classifyGeminiError(error) !== "transient" || attempts === 2) return { error, attempts };
      await sleep(100);
    }
  }
  return { error: new Error("Unreachable probe state."), attempts };
}

function notAttempted(configuration: ProbeRequestConfiguration): StructuredProbeDiagnostic {
  return {
    attempted: false, endpointReachable: false, modelReachable: false, requestAccepted: false,
    responseReceived: false, jsonParseValid: false, schemaValid: false, structuredOutputSupported: false,
    transportStatus: "NOT_ATTEMPTED", contractStatus: "NOT_TESTED", availabilityStatus: "UNKNOWN",
    responseShape: "EMPTY", diagnosticJsonExtracted: false, responseLength: 0, candidateCount: 0,
    durationMs: 0, attempts: 0, requestConfiguration: configuration,
  };
}

async function executeStructuredProbe(
  generate: Generate,
  model: string,
  location: string,
  strictPrompt: boolean,
  savePrefix: boolean,
  sleep: (ms: number) => Promise<void>,
  now: () => number,
  thinkingConfig?: { thinkingBudget: number },
): Promise<StructuredProbeDiagnostic> {
  const built = request(model, location, strictPrompt, thinkingConfig);
  const started = now();
  const generated = await generateWithOneTransientRetry(generate, built.parameters, sleep);
  if ("error" in generated) {
    const category = probeErrorCategory(generated.error);
    const status = transportStatus(category);
    return {
      ...notAttempted(built.configuration),
      attempted: true,
      endpointReachable: ["AUTHENTICATION_FAILED", "AUTHORIZATION_FAILED", "MODEL_NOT_FOUND", "PERMANENT_FAILURE"].includes(status),
      transportStatus: status,
      contractStatus: category === "unsupported-model" ? "UNSUPPORTED" : "NOT_TESTED",
      availabilityStatus: status === "MODEL_NOT_FOUND" ? "UNAVAILABLE" : "UNKNOWN",
      durationMs: now() - started,
      attempts: generated.attempts,
      errorCategory: category,
      sanitizedError: sanitizeError(generated.error),
    };
  }

  const response = generated.response;
  const metadata = normalizeGeminiResponseMetadata(response);
  const text = response.text ?? "";
  const shape = responseShape(text);
  let jsonParseValid = false;
  let schemaValid = false;
  try {
    const parsed = JSON.parse(text) as { status?: unknown; candidate?: unknown };
    jsonParseValid = true;
    schemaValid = parsed.status === "ok" && parsed.candidate === model;
  } catch {}
  const safetyBlocked = metadata.finishReason === "SAFETY";
  const invalidFinish = Boolean(metadata.finishReason && metadata.finishReason !== "STOP");
  const contractStatus: ProbeContractStatus = !text.trim()
    ? "EMPTY_RESPONSE"
    : safetyBlocked ? "SAFETY_BLOCKED"
    : invalidFinish ? "FINISH_REASON_INVALID"
    : !jsonParseValid
      ? shape.shape === "NON_JSON_TEXT" || shape.shape === "MARKDOWN_FENCED_JSON" || shape.shape === "PROSE_WRAPPED_JSON"
        ? "NON_JSON_RESPONSE" : "JSON_PARSE_FAILED"
      : !schemaValid ? "SCHEMA_INVALID" : "VALID";
  const compatible = contractStatus === "VALID";
  return {
    attempted: true,
    endpointReachable: true,
    modelReachable: true,
    requestAccepted: true,
    responseReceived: true,
    jsonParseValid,
    schemaValid,
    structuredOutputSupported: compatible,
    transportStatus: "REACHABLE",
    contractStatus,
    availabilityStatus: compatible ? "AVAILABLE_AND_COMPATIBLE" : "AVAILABLE_CONTRACT_INCOMPATIBLE",
    responseShape: shape.shape,
    diagnosticJsonExtracted: shape.diagnosticJsonExtracted,
    ...(savePrefix && text ? { responsePrefix: sanitizedPrefix(text) } : {}),
    responseLength: text.length,
    contentType: contentType(response),
    candidateCount: metadata.candidateCount,
    finishReason: metadata.finishReason,
    actualModel: model,
    modelVersion: metadata.modelVersion,
    usageMetadata: metadata.usageMetadata,
    durationMs: now() - started,
    attempts: generated.attempts,
    requestConfiguration: built.configuration,
  };
}

export async function probeCandidateAvailability(
  input: CandidateAvailabilityProbeInput,
  dependencies: AvailabilityProbeDependencies = {},
): Promise<CandidateAvailabilityResult> {
  const now = dependencies.now ?? Date.now;
  const checkedAt = new Date(now()).toISOString();
  const primaryRequest = request(input.candidateModel, input.location, false);
  const strictRequest = request(input.candidateModel, input.location, true);
  if (input.dryRun) {
    const primary = notAttempted(primaryRequest.configuration);
    return {
      candidateModel: input.candidateModel, projectConfigured: Boolean(input.projectId), location: input.location,
      endpointReachable: false, modelReachable: false, requestAccepted: false, responseReceived: false,
      jsonParseValid: false, schemaValid: false, structuredOutputSupported: false,
      thinkingConfigurationSupported: null, transportStatus: "NOT_ATTEMPTED", contractStatus: "NOT_TESTED",
      availabilityStatus: "UNKNOWN", durationMs: 0, attempts: 0, checkedAt,
      primaryStructuredProbe: primary, strictPromptRetryProbe: notAttempted(strictRequest.configuration),
    };
  }
  const client = dependencies.generate ? undefined : new GoogleGenAI({
    vertexai: true, project: input.projectId, location: input.location, apiVersion: "v1",
    httpOptions: { timeout: input.timeoutMs },
  });
  const generate = dependencies.generate ?? ((parameters) => client!.models.generateContent(parameters));
  const sleep = dependencies.sleep ?? ((milliseconds) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const started = now();
  let requestsUsed = 0;
  const primary = await executeStructuredProbe(
    generate, input.candidateModel, input.location, false, input.saveResponsePrefix !== false, sleep, now,
  );
  requestsUsed += primary.attempts;
  let retry = notAttempted(strictRequest.configuration);
  if (
    input.jsonRetry &&
    primary.responseReceived &&
    !primary.jsonParseValid &&
    requestsUsed < (input.requestBudget ?? Number.POSITIVE_INFINITY)
  ) {
    retry = await executeStructuredProbe(
      generate, input.candidateModel, input.location, true, input.saveResponsePrefix !== false, sleep, now,
    );
    requestsUsed += retry.attempts;
  }

  let thinkingConfigurationSupported: boolean | null = null;
  if (input.probeThinking && primary.modelReachable) {
    const thinking = buildThinkingConfig(input.candidateModel, input.thinkingMode ?? "auto");
    if (thinking && requestsUsed < (input.requestBudget ?? Number.POSITIVE_INFINITY)) {
      const thinkingProbe = await executeStructuredProbe(
        generate, input.candidateModel, input.location, false, false, sleep, now, thinking,
      );
      requestsUsed += thinkingProbe.attempts;
      thinkingConfigurationSupported = thinkingProbe.structuredOutputSupported;
    }
  }
  return {
    candidateModel: input.candidateModel,
    projectConfigured: Boolean(input.projectId),
    location: input.location,
    endpointReachable: primary.endpointReachable,
    modelReachable: primary.modelReachable,
    requestAccepted: primary.requestAccepted,
    responseReceived: primary.responseReceived,
    jsonParseValid: primary.jsonParseValid,
    schemaValid: primary.schemaValid,
    structuredOutputSupported: primary.structuredOutputSupported,
    thinkingConfigurationSupported,
    transportStatus: primary.transportStatus,
    contractStatus: primary.contractStatus,
    availabilityStatus: primary.availabilityStatus,
    actualModel: primary.actualModel,
    modelVersion: primary.modelVersion,
    durationMs: now() - started,
    attempts: requestsUsed,
    finishReason: primary.finishReason,
    usageMetadata: primary.usageMetadata,
    errorCategory: primary.errorCategory,
    sanitizedError: primary.sanitizedError,
    checkedAt,
    primaryStructuredProbe: primary,
    strictPromptRetryProbe: retry,
  };
}

export async function probeCandidateLocations(
  input: Omit<CandidateAvailabilityProbeInput, "location"> & { locations: readonly string[]; stopOnSuccess?: boolean },
  dependenciesForLocation: (location: string) => AvailabilityProbeDependencies = () => ({}),
) {
  const results: CandidateAvailabilityResult[] = [];
  let remainingBudget = input.requestBudget ?? Number.POSITIVE_INFINITY;
  for (const location of input.locations) {
    const result = await probeCandidateAvailability(
      { ...input, location, requestBudget: remainingBudget },
      dependenciesForLocation(location),
    );
    results.push(result);
    remainingBudget -= result.attempts;
    if (input.stopOnSuccess && result.availabilityStatus === "AVAILABLE_AND_COMPATIBLE") break;
  }
  return results;
}
