import { createHash } from "node:crypto";
import { GeminiAnalysisOutputSchema, type SourceRecord } from "@/domain/schemas";
import {
  BusinessContextSchema,
  GeminiDecisionOutputSchema,
  SignalIntelligenceSchema,
  type ReadySignalIntelligence,
} from "@/domain/decision-intelligence";
import {
  buildDecisionIntelligencePrompt,
  buildSignalIntelligencePrompt,
  calculateDecisionScore,
  DECISION_INTELLIGENCE_JSON_SCHEMA,
  parseDecisionIntelligence,
  parseSignalIntelligence,
  SIGNAL_INTELLIGENCE_JSON_SCHEMA,
} from "../decision-engine";
import { ControlledGeminiClient, classifyGeminiError, type GeminiGenerationResult } from "../gemini-client";
import type { GeminiRuntimeConfig } from "../gemini-runtime-config";
import { sanitizeError } from "./redaction";
import type { EvaluationCase, ModelCaseResult, StageEvaluationResult } from "./types";
import { createVertexRequestBudget, VertexRequestBudgetExceeded } from "./live-safety";

export type EvaluationModelRunner = (testCase: EvaluationCase, model: string) => Promise<ModelCaseResult>;

function sourceRecord(testCase: EvaluationCase): SourceRecord {
  const content = testCase.source.content.padEnd(200, " ");
  return {
    id: `evaluation-${testCase.id}`,
    sourceUrl: testCase.source.url,
    sourceName: testCase.source.publisher,
    title: testCase.source.title,
    publishedAt: testCase.source.publishedAt,
    fetchedAt: testCase.source.publishedAt,
    normalizedText: content,
    contentHash: createHash("sha256").update(content).digest("hex"),
    sourceType: "official_announcement",
  };
}

function usage(generation: GeminiGenerationResult) {
  const metadata = generation.metadata.usageMetadata as {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  } | undefined;
  return {
    inputTokens: metadata?.promptTokenCount,
    outputTokens: metadata?.candidatesTokenCount,
    totalTokens: metadata?.totalTokenCount,
  };
}

function baseStage(model: string, durationMs: number): StageEvaluationResult {
  return {
    requestedModel: model, actualModel: model, fallbackUsed: false, attempts: 1, durationMs,
    requestSucceeded: false, transportSuccess: false, responseReceived: false,
    jsonParseValid: false, jsonParsed: false, schemaValid: false, applicationValid: false,
    exactQuoteValid: false, evidenceIdsValid: false, enumValid: false, insufficientEvidence: false,
    candidateCount: 0, validationErrors: [],
    stageDurations: { requestMs: durationMs, validationMs: 0, totalMs: durationMs },
    promotionImpact: "RELIABILITY_FAILURE",
  };
}

function requestFailure(model: string, durationMs: number, error: unknown): StageEvaluationResult {
  const category = classifyGeminiError(error);
  return {
    ...baseStage(model, durationMs),
    failedStage: "REQUEST",
    requestErrorCategory: category,
    failureCategory: category === "transient" && /timeout/i.test(String(error)) ? "timeout" : category,
    sanitizedError: sanitizeError(error),
    validationErrors: [sanitizeError(error)],
  };
}

export function validateEvaluationSchemaVersion(raw: unknown, stage: "signal" | "decision") {
  if (stage === "decision") {
    const current = GeminiDecisionOutputSchema.safeParse(raw);
    return { valid: current.success, version: current.success ? "decision-intelligence-v1" : undefined, errors: current.success ? [] : current.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  }
  const current = SignalIntelligenceSchema.safeParse(raw);
  if (current.success) return { valid: true, version: "signal-intelligence-v1", errors: [] };
  const legacy = GeminiAnalysisOutputSchema.safeParse(raw);
  if (legacy.success) return { valid: true, version: "legacy-analysis-v1", errors: ["Legacy schema matched; current two-stage application validation was not run."] };
  return {
    valid: false,
    version: undefined,
    errors: current.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
}

async function runStage<T>(
  client: ControlledGeminiClient,
  model: string,
  stage: "signal" | "decision",
  contents: string,
  responseJsonSchema: unknown,
  temperature: number,
  applicationParser: (text: string) => T,
  now: () => number,
): Promise<{ result?: T; text: string; diagnostic: StageEvaluationResult }> {
  const started = now();
  let generation: GeminiGenerationResult;
  try {
    generation = await client.generateContent({
      contents,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        temperature,
        maxOutputTokens: client.config.maxOutputTokens,
      },
    }, model);
  } catch (error) {
    if (error instanceof VertexRequestBudgetExceeded) throw error;
    return { text: "", diagnostic: requestFailure(model, now() - started, error) };
  }
  const requestFinished = now();
  const text = generation.response.text ?? "";
  const diagnostic: StageEvaluationResult = {
    ...baseStage(model, generation.durationMs),
    requestedModel: model,
    actualModel: generation.actualModel,
    fallbackUsed: generation.fallbackUsed,
    attempts: generation.attempts,
    requestSucceeded: true,
    transportSuccess: true,
    responseReceived: Boolean(text),
    candidateCount: generation.metadata.candidateCount,
    finishReason: generation.metadata.finishReason,
    safetyState: generation.metadata.safetyInformation ? "present" : undefined,
    modelVersion: generation.metadata.modelVersion,
    exactQuoteValid: true,
    evidenceIdsValid: true,
    enumValid: true,
    stageDurations: { requestMs: generation.durationMs, validationMs: 0, totalMs: generation.durationMs },
    promotionImpact: "NONE",
    ...usage(generation),
  };
  if (!text) {
    return { text, diagnostic: { ...diagnostic, failedStage: "RESPONSE", validationErrors: ["Model returned no text."], promotionImpact: "CONTRACT_FAILURE" } };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
    diagnostic.jsonParseValid = true;
    diagnostic.jsonParsed = true;
  } catch {
    return { text, diagnostic: { ...diagnostic, failedStage: "JSON_PARSE", validationErrors: ["Response was not valid raw JSON."], promotionImpact: "CONTRACT_FAILURE" } };
  }
  const versions = validateEvaluationSchemaVersion(raw, stage);
  diagnostic.schemaValid = versions.valid;
  diagnostic.schemaVersionMatched = versions.version;
  diagnostic.validationErrors = versions.errors;
  if (!versions.valid) {
    diagnostic.failedStage = "SCHEMA";
    diagnostic.promotionImpact = "CONTRACT_FAILURE";
    diagnostic.stageDurations!.validationMs = now() - requestFinished;
    diagnostic.stageDurations!.totalMs = now() - started;
    return { text, diagnostic };
  }
  if (versions.version?.startsWith("legacy-")) {
    diagnostic.failedStage = "APPLICATION_VALIDATION";
    diagnostic.promotionImpact = "APPLICATION_FAILURE";
    return { text, diagnostic };
  }
  try {
    const result = applicationParser(text);
    diagnostic.applicationValid = true;
    diagnostic.exactQuoteValid = true;
    diagnostic.evidenceIdsValid = true;
    diagnostic.enumValid = true;
    diagnostic.insufficientEvidence = Boolean(result && typeof result === "object" && (result as { status?: unknown }).status === "INSUFFICIENT_EVIDENCE");
    diagnostic.stageDurations!.validationMs = now() - requestFinished;
    diagnostic.stageDurations!.totalMs = now() - started;
    diagnostic.durationMs = diagnostic.stageDurations!.totalMs;
    return { result, text, diagnostic };
  } catch (error) {
    const message = sanitizeError(error);
    diagnostic.failedStage = "APPLICATION_VALIDATION";
    diagnostic.validationErrors!.push(message);
    diagnostic.sanitizedError = message;
    diagnostic.exactQuoteValid = !/not an exact excerpt/i.test(message);
    diagnostic.evidenceIdsValid = !/unknown evidence|duplicate evidence/i.test(message);
    diagnostic.enumValid = !/invalid enum|invalid_value/i.test(message);
    diagnostic.promotionImpact = "APPLICATION_FAILURE";
    diagnostic.stageDurations!.validationMs = now() - requestFinished;
    diagnostic.stageDurations!.totalMs = now() - started;
    return { text, diagnostic };
  }
}

export function createEvaluationModelRunner(
  productionConfig: GeminiRuntimeConfig,
  now: () => number = Date.now,
): EvaluationModelRunner {
  const requestBudget = createVertexRequestBudget(productionConfig.evaluation.maxRequests);
  return async (testCase, model) => {
    const isBaseline = model === productionConfig.primaryModel;
    const isolatedConfig: GeminiRuntimeConfig = Object.freeze({
      ...productionConfig,
      primaryModel: model,
      fallbackModel: isBaseline ? productionConfig.fallbackModel : model,
      fallbackEnabled: isBaseline ? productionConfig.fallbackEnabled : false,
      timeoutMs: productionConfig.evaluation.timeoutMs,
      shadowEnabled: false,
      shadowModel: "",
    });
    const client = new ControlledGeminiClient(isolatedConfig, {
      beforeRequest: requestBudget.beforeRequest,
    });
    const source = sourceRecord(testCase);
    const signalStage = await runStage(
      client, model, "signal", buildSignalIntelligencePrompt(source), SIGNAL_INTELLIGENCE_JSON_SCHEMA, 0,
      (text) => parseSignalIntelligence(text, source.normalizedText), now,
    );
    if (!signalStage.result) {
      return {
        model, signal: signalStage.diagnostic, pipelineCompleted: false, status: "FAILED",
        evidenceCount: 0, outputText: signalStage.text,
      };
    }
    const signal = signalStage.result;
    if (signal.status === "INSUFFICIENT_EVIDENCE") {
      return {
        model, signal: signalStage.diagnostic, pipelineCompleted: true, status: "INSUFFICIENT_EVIDENCE",
        evidenceCount: signal.evidence.length, outputText: signalStage.text, validatedSignal: signal,
      };
    }
    const context = BusinessContextSchema.parse(testCase.businessContext);
    const decisionStage = await runStage(
      client, model, "decision", buildDecisionIntelligencePrompt(signal, context), DECISION_INTELLIGENCE_JSON_SCHEMA, .1,
      (text) => parseDecisionIntelligence(text, signal as ReadySignalIntelligence), now,
    );
    if (!decisionStage.result) {
      decisionStage.diagnostic.promotionImpact = "PIPELINE_FAILURE";
      return {
        model, signal: signalStage.diagnostic, decision: decisionStage.diagnostic,
        pipelineCompleted: false, status: "FAILED", evidenceCount: signal.evidence.length,
        outputText: JSON.stringify({ signal: JSON.parse(signalStage.text), decision: decisionStage.text }),
        validatedSignal: signal,
      };
    }
    const decision = decisionStage.result;
    if (decision.status === "INSUFFICIENT_EVIDENCE") {
      return {
        model, signal: signalStage.diagnostic, decision: decisionStage.diagnostic,
        pipelineCompleted: true, status: "INSUFFICIENT_EVIDENCE", evidenceCount: signal.evidence.length,
        outputText: JSON.stringify({ signal: JSON.parse(signalStage.text), decision: JSON.parse(decisionStage.text) }),
        validatedSignal: signal, validatedDecision: decision,
      };
    }
    const score = calculateDecisionScore({
      signalImportance: signal.signalImportance, evidenceConfidence: signal.evidenceConfidence,
      businessApplicability: decision.businessApplicability, urgency: decision.urgency, expectedImpact: decision.expectedImpact,
    });
    return {
      model, signal: signalStage.diagnostic, decision: decisionStage.diagnostic,
      pipelineCompleted: true, status: "READY", recommendation: decision.recommendedPosition,
      score: score.decisionScore, confidence: decision.confidence, relevance: signal.signalImportance,
      evidenceCount: signal.evidence.length,
      outputText: JSON.stringify({ signal: JSON.parse(signalStage.text), decision: JSON.parse(decisionStage.text) }),
      validatedSignal: signal,
      validatedDecision: decision,
    };
  };
}
