import type { GenerateContentResponse } from "@google/genai";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { executeProbeCli, ProbeCliError, probeExitCode } from "../../../scripts/probe-gemini-candidate";
import { parseGeminiRuntimeConfig } from "../gemini-runtime-config";
import { evaluatePromotion } from "./comparator";
import { validateEvaluationDataset } from "./dataset-validator";
import {
  assertCandidateApprovedForEvaluation,
  assertRealCallGuard,
  assertSmokeCaseCount,
  assertUsageWithinLimits,
} from "./live-safety";
import { probeCandidateAvailability, probeCandidateLocations, type CandidateAvailabilityResult } from "./model-availability";
import { buildProbeReport, overallProbeStatus, probeMarkdown } from "./probe-report";
import type { ComparativeMetrics, ModelMetrics } from "./types";

const response = (model: string) => ({
  text: JSON.stringify({ status: "ok", candidate: model }),
  modelVersion: `${model}-version`,
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
  candidates: [{ finishReason: "STOP" }],
}) as unknown as GenerateContentResponse;

const baseEnv = {
  GOOGLE_CLOUD_PROJECT: "test-project",
  GEMINI_EVALUATION_ENABLED: "true",
  GEMINI_EVALUATION_CANDIDATE_MODEL: "candidate-model",
  GEMINI_EVALUATION_ALLOWED_MODELS: "candidate-model",
  GEMINI_EVALUATION_RUN_LABEL: "candidate-probe-test",
};

const goodMetrics: ModelMetrics = {
  requestSuccessRate: 1, jsonParseSuccessRate: 1, schemaValidRate: 1, applicationValidationRate: 1,
  exactEvidenceRate: 1, evidenceIdComplianceRate: 1, enumComplianceRate: 1, pipelineCompletionRate: 1,
  insufficientEvidenceCorrectnessRate: 1, meanLatencyMs: 100, medianLatencyMs: 100, p95LatencyMs: 100,
  averageAttempts: 1, fallbackRate: 0, timeoutRate: 0, missingTokenMetadataRate: 0,
};
const agreement: ComparativeMetrics = {
  statusAgreementRate: 1, recommendationAgreementRate: 1, meanScoreDrift: 0, meanConfidenceDrift: 0,
  meanRelevanceDrift: 0, meanEvidenceCountDrift: 0, insufficientEvidenceAgreementRate: 1,
  requiredKeywordComplianceRate: 1, forbiddenKeywordViolationRate: 0, unsupportedClaimRate: 0, quotationMismatchRate: 0,
};

describe("live evaluation safety", () => {
  it("disables real calls by default and requires exact allowlisting", () => {
    const disabled = parseGeminiRuntimeConfig(baseEnv);
    expect(disabled.evaluation.allowRealCalls).toBe(false);
    expect(() => assertRealCallGuard(disabled)).toThrow("ALLOW_REAL_CALLS");
    expect(() => assertCandidateApprovedForEvaluation(parseGeminiRuntimeConfig({
      ...baseEnv,
      GEMINI_EVALUATION_ALLOWED_MODELS: "candidate-model-preview",
    }))).toThrow("exactly match");
  });

  it("rejects production model as candidate and requires a run label", () => {
    expect(() => assertCandidateApprovedForEvaluation(parseGeminiRuntimeConfig({
      GOOGLE_CLOUD_PROJECT: "test",
      GEMINI_EVALUATION_ENABLED: "true",
      GEMINI_EVALUATION_CANDIDATE_MODEL: "gemini-2.5-flash",
      GEMINI_EVALUATION_ALLOWED_MODELS: "gemini-2.5-flash",
    }))).toThrow("production model");
    expect(() => assertRealCallGuard(parseGeminiRuntimeConfig({
      ...baseEnv,
      GEMINI_EVALUATION_ALLOW_REAL_CALLS: "true",
      GEMINI_EVALUATION_RUN_LABEL: "",
    }))).toThrow("RUN_LABEL");
  });

  it("enforces request, token, and hard-case ceilings", () => {
    const config = parseGeminiRuntimeConfig(baseEnv);
    expect(() => assertUsageWithinLimits(config, { requests: 7, estimatedInputTokens: 1, estimatedOutputTokens: 1 })).toThrow("MAX_REQUESTS");
    expect(() => assertUsageWithinLimits(config, { requests: 1, estimatedInputTokens: 20_001, estimatedOutputTokens: 1 })).toThrow("INPUT_TOKENS");
    expect(() => assertUsageWithinLimits(config, { requests: 1, estimatedInputTokens: 1, estimatedOutputTokens: 5_001 })).toThrow("OUTPUT_TOKENS");
    expect(() => assertSmokeCaseCount(config, 2, true)).toThrow("HARD_CASE_LIMIT");
    expect(() => assertSmokeCaseCount(config, 1, false)).not.toThrow();
  });

  it("blocks non-GA candidates from canary while GA still needs quality thresholds", () => {
    expect(evaluatePromotion(goodMetrics, goodMetrics, agreement, [], "preview").recommendation).toBe("ELIGIBLE_FOR_MORE_TESTING");
    expect(evaluatePromotion(goodMetrics, goodMetrics, agreement, [], "unknown").recommendation).toBe("ELIGIBLE_FOR_MORE_TESTING");
    expect(evaluatePromotion(goodMetrics, goodMetrics, agreement, [], "ga").recommendation).toBe("ELIGIBLE_FOR_CANARY");
    expect(evaluatePromotion(goodMetrics, { ...goodMetrics, pipelineCompletionRate: .5 }, agreement, [], "ga").recommendation).toBe("NOT_ELIGIBLE");
  });
});

describe("candidate availability probe", () => {
  const input = {
    projectId: "test-project",
    location: "us-central1",
    candidateModel: "candidate-model",
    timeoutMs: 1_000,
    dryRun: false,
  };

  it("returns normalized structured-output success and metadata", async () => {
    const result = await probeCandidateAvailability(input, { generate: vi.fn().mockResolvedValue(response("candidate-model")) });
    expect(result).toMatchObject({
      availabilityStatus: "AVAILABLE_AND_COMPATIBLE",
      structuredOutputSupported: true,
      thinkingConfigurationSupported: null,
      actualModel: "candidate-model",
      modelVersion: "candidate-model-version",
      attempts: 1,
      finishReason: "STOP",
    });
  });

  it.each([
    [404, "model-availability"],
    [400, "unsupported-model", "unsupported model configuration"],
    [401, "authentication"],
    [403, "authorization"],
  ])("normalizes failure status %s as %s without retry", async (status, category, message = "") => {
    const generate = vi.fn().mockRejectedValue({ status, message });
    const result = await probeCandidateAvailability(input, { generate });
    expect(result).toMatchObject({ modelReachable: false, errorCategory: category, attempts: 1 });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("retries one transient failure only", async () => {
    const generate = vi.fn().mockRejectedValueOnce({ status: 503 }).mockResolvedValue(response("candidate-model"));
    const result = await probeCandidateAvailability(input, { generate, sleep: async () => {} });
    expect(result).toMatchObject({ modelReachable: true, attempts: 2 });
  });

  it("tries ordered locations and can succeed after regional unavailability", async () => {
    const results = await probeCandidateLocations(
      { ...input, locations: ["us-central1", "global"], stopOnSuccess: true },
      (location) => ({ generate: location === "global"
        ? vi.fn().mockResolvedValue(response("candidate-model"))
        : vi.fn().mockRejectedValue({ status: 404 }) }),
    );
    expect(results.map((item) => [item.location, item.modelReachable])).toEqual([["us-central1", false], ["global", true]]);
  });

  it("keeps basic success when optional thinking compatibility fails", async () => {
    const generate = vi.fn().mockResolvedValueOnce(response("candidate-model")).mockRejectedValueOnce({ status: 400 });
    const result = await probeCandidateAvailability(
      { ...input, probeThinking: true, thinkingMode: "budget-zero" },
      { generate },
    );
    expect(result).toMatchObject({ modelReachable: true, structuredOutputSupported: true, thinkingConfigurationSupported: false });
  });

  it.each([
    ["Here is the JSON", "NON_JSON_TEXT", "NON_JSON_RESPONSE"],
    ["```json\n{\"status\":\"ok\",\"candidate\":\"candidate-model\"}\n```", "MARKDOWN_FENCED_JSON", "NON_JSON_RESPONSE"],
    ["Here is the JSON {\"status\":\"ok\",\"candidate\":\"candidate-model\"}", "PROSE_WRAPPED_JSON", "NON_JSON_RESPONSE"],
    ["{\"status\":\"ok\",\"candidate\":\"candidate-model\"} trailing explanation", "PROSE_WRAPPED_JSON", "NON_JSON_RESPONSE"],
    ["", "EMPTY", "EMPTY_RESPONSE"],
    ["{\"status\":", "RAW_JSON", "JSON_PARSE_FAILED"],
  ])("diagnoses response shape %s without granting compatibility", async (text, shape, contractStatus) => {
    const generate = vi.fn().mockResolvedValue({ ...response("candidate-model"), text });
    const result = await probeCandidateAvailability(input, { generate });
    expect(result).toMatchObject({
      endpointReachable: true,
      modelReachable: true,
      requestAccepted: true,
      responseReceived: true,
      jsonParseValid: false,
      structuredOutputSupported: false,
      transportStatus: "REACHABLE",
      contractStatus,
      availabilityStatus: "AVAILABLE_CONTRACT_INCOMPATIBLE",
      primaryStructuredProbe: { responseShape: shape },
    });
  });

  it("rejects valid JSON that violates the required schema", async () => {
    const generate = vi.fn().mockResolvedValue({ ...response("candidate-model"), text: JSON.stringify({ status: "ok", candidate: "wrong-model" }) });
    const result = await probeCandidateAvailability(input, { generate });
    expect(result).toMatchObject({ jsonParseValid: true, schemaValid: false, contractStatus: "SCHEMA_INVALID" });
  });

  it("extracts diagnostic JSON without passing the strict raw-JSON contract", async () => {
    const text = `Intro ${JSON.stringify({ status: "ok", candidate: "candidate-model" })} outro`;
    const result = await probeCandidateAvailability(input, { generate: vi.fn().mockResolvedValue({ ...response("candidate-model"), text }) });
    expect(result.primaryStructuredProbe).toMatchObject({
      diagnosticJsonExtracted: true,
      responseShape: "PROSE_WRAPPED_JSON",
      jsonParseValid: false,
      structuredOutputSupported: false,
    });
  });

  it("truncates and sanitizes the optional response prefix", async () => {
    const text = `token=private-value ${"x".repeat(200)}`;
    const result = await probeCandidateAvailability(input, { generate: vi.fn().mockResolvedValue({ ...response("candidate-model"), text }) });
    expect(result.primaryStructuredProbe.responsePrefix!.length).toBeLessThanOrEqual(120);
    expect(result.primaryStructuredProbe.responsePrefix).not.toContain("private-value");
    const hidden = await probeCandidateAvailability({ ...input, saveResponsePrefix: false }, {
      generate: vi.fn().mockResolvedValue({ ...response("candidate-model"), text }),
    });
    expect(hidden.primaryStructuredProbe.responsePrefix).toBeUndefined();
  });

  it("reports sanitized request configuration", async () => {
    const result = await probeCandidateAvailability(input, { generate: vi.fn().mockResolvedValue(response("candidate-model")) });
    expect(result.primaryStructuredProbe.requestConfiguration).toEqual({
      responseMimeTypeIncluded: true,
      responseJsonSchemaIncluded: true,
      responseSchemaIncluded: false,
      temperature: 0,
      maxOutputTokens: 128,
      thinkingConfig: "OMITTED",
      apiVersion: "v1",
      vertexAiMode: true,
      location: "us-central1",
    });
  });

  it("keeps strict-prompt retry disabled by default", async () => {
    const generate = vi.fn().mockResolvedValue({ ...response("candidate-model"), text: "Here is the JSON" });
    const result = await probeCandidateAvailability(input, { generate });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.strictPromptRetryProbe.attempted).toBe(false);
  });

  it("reports optional strict-prompt retry success without promoting the failed primary contract", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce({ ...response("candidate-model"), text: "Here is the JSON" })
      .mockResolvedValueOnce(response("candidate-model"));
    const result = await probeCandidateAvailability({ ...input, jsonRetry: true, requestBudget: 2 }, { generate });
    expect(result.availabilityStatus).toBe("AVAILABLE_CONTRACT_INCOMPATIBLE");
    expect(result.primaryStructuredProbe.structuredOutputSupported).toBe(false);
    expect(result.strictPromptRetryProbe).toMatchObject({ attempted: true, structuredOutputSupported: true });
  });

  it("does not exceed request budget for strict-prompt retry", async () => {
    const generate = vi.fn().mockResolvedValue({ ...response("candidate-model"), text: "Here is the JSON" });
    const result = await probeCandidateAvailability({ ...input, jsonRetry: true, requestBudget: 1 }, { generate });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.strictPromptRetryProbe.attempted).toBe(false);
  });
});

describe("probe CLI, dataset, and reports", () => {
  it("makes zero calls in probe validation and dry-run modes", async () => {
    await expect(executeProbeCli("validate", {}, process.cwd())).resolves.toMatchObject({ modelCalls: 0 });
    await expect(executeProbeCli("dry-run", {}, process.cwd())).resolves.toMatchObject({ modelCalls: 0 });
  });

  it("guards real probe execution", async () => {
    await expect(executeProbeCli("probe", baseEnv, process.cwd())).rejects.toThrow("ALLOW_REAL_CALLS");
  });

  it("validates exactly one concise official smoke case", async () => {
    const dataset = validateEvaluationDataset(JSON.parse(await readFile("eval/datasets/gemini-migration.json", "utf8")));
    const smoke = dataset.cases.filter((item) => item.smokeTest);
    expect(smoke).toHaveLength(1);
    expect(smoke[0]).toMatchObject({ id: "official-google-announcement", category: "official-source", language: "en" });
  });

  it("produces a redacted approval-limited probe report", () => {
    const config = parseGeminiRuntimeConfig({ ...baseEnv, GEMINI_EVALUATION_ALLOW_REAL_CALLS: "true" });
    const report = buildProbeReport(process.cwd(), config, [{
      candidateModel: "candidate-model", projectConfigured: true, location: "us-central1",
      endpointReachable: true, modelReachable: false, requestAccepted: false, responseReceived: false,
      jsonParseValid: false, schemaValid: false, transportStatus: "AUTHENTICATION_FAILED",
      contractStatus: "NOT_TESTED", availabilityStatus: "UNKNOWN",
      structuredOutputSupported: false, thinkingConfigurationSupported: null, durationMs: 1, attempts: 1,
      errorCategory: "authentication", sanitizedError: "token=[REDACTED]", checkedAt: "2026-07-30T00:00:00Z",
    } as unknown as CandidateAvailabilityResult]);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("test-project");
    expect(probeMarkdown(report)).toContain("does not mean production approval");
    expect(report.noDeploymentOccurred).toBe(true);
    expect(report.productionConfigurationUnchanged).toBe(true);
  });

  it("classifies mixed 404 and reachable contract failure correctly", async () => {
    const results = await probeCandidateLocations(
      { projectId: "test", candidateModel: "candidate-model", timeoutMs: 1_000, dryRun: false, locations: ["us-central1", "global"] },
      (location) => ({ generate: location === "global"
        ? vi.fn().mockResolvedValue({ ...response("candidate-model"), text: "Here is the JSON" })
        : vi.fn().mockRejectedValue({ status: 404 }) }),
    );
    expect(overallProbeStatus(results)).toBe("REACHABLE_BUT_CONTRACT_FAILED");
  });

  it("maps probe outcomes to distinct CLI exit codes", () => {
    expect(probeExitCode(new ProbeCliError("contract", 2))).toBe(2);
    expect(probeExitCode(new ProbeCliError("unavailable", 3))).toBe(3);
    expect(probeExitCode(new Error("GEMINI_EVALUATION configuration failed"))).toBe(4);
    expect(probeExitCode(new Error("unexpected failure"))).toBe(5);
  });
});
