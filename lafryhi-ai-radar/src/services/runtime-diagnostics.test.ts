import type { GenerateContentResponse } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { ControlledGeminiClient } from "./gemini-client";
import { parseGeminiRuntimeConfig } from "./gemini-runtime-config";
import {
  parseGeminiDiagnosticOutput,
  runGeminiDiagnostic,
  runRuntimeDiagnostic,
  type GeminiDiagnosticLevel,
  type VertexDiagnostic,
} from "./runtime-diagnostics";

const config = parseGeminiRuntimeConfig({
  GOOGLE_CLOUD_PROJECT: "test-project",
  GEMINI_PRIMARY_MODEL: "gemini-test",
  GEMINI_FALLBACK_MODEL: "gemini-test",
});

function response(text: string) {
  return {
    text,
    modelVersion: "test-version",
    candidates: [{ finishReason: "STOP" }],
  } as unknown as GenerateContentResponse;
}

function diagnostic(level: GeminiDiagnosticLevel): VertexDiagnostic {
  return {
    status: "ok",
    level,
    model: "gemini-test",
    actualModel: "gemini-test",
    fallbackModel: "gemini-test",
    fallbackUsed: false,
    attempts: 1,
    region: "us-central1",
    latencyMs: 12,
    timeoutMs: 60_000,
    maxOutputTokens: 8_192,
    projectConfigured: true,
    sdkVersion: "2.13.0",
    structuredJsonValid: true,
    responseMetadata: { candidateCount: 1 },
    responseSummary: level === "connectivity"
      ? "Model returned the required minimal connectivity acknowledgement."
      : "Model satisfied the representative structured-output contract.",
  };
}

describe("runtime diagnostics", () => {
  it("rejects malformed or schema-invalid diagnostic output", () => {
    expect(() => parseGeminiDiagnosticOutput("not-json")).toThrow("malformed JSON");
    expect(() => parseGeminiDiagnosticOutput(JSON.stringify({ status: "maybe", message: "not valid output" }))).toThrow();
  });

  it.each([
    ["connectivity", { status: "ok", message: "Connectivity succeeded." }],
    ["production-contract", {
      status: "ok",
      facts: [{ id: "F1", text: "The migration contract test is active." }],
      confidence: 100,
    }],
  ] as const)("validates the %s diagnostic contract", async (level, output) => {
    const generate = vi.fn().mockResolvedValue(response(JSON.stringify(output)));
    const client = new ControlledGeminiClient(config, { generate });
    const result = await runGeminiDiagnostic(level, client);
    expect(result).toMatchObject({
      level,
      model: "gemini-test",
      actualModel: "gemini-test",
      structuredJsonValid: true,
      sdkVersion: "2.13.0",
      responseMetadata: { modelVersion: "test-version", finishReason: "STOP", candidateCount: 1 },
    });
    expect(generate.mock.calls[0][0].config.responseJsonSchema).toBeDefined();
    expect(generate.mock.calls[0][0].config.thinkingConfig).toBeUndefined();
  });

  it("returns both validated diagnostic levels from deterministic dependencies", async () => {
    const result = await runRuntimeDiagnostic({
      async verifyFirestoreLifecycle() {
        return { writeReadVerified: true, deleteVerified: true, collectionEmpty: true };
      },
      async invokeVertexAi(level) {
        return diagnostic(level);
      },
    });

    expect(result.status).toBe("ok");
    expect(result.firestore.collectionEmpty).toBe(true);
    expect(result.vertexAi.connectivity.level).toBe("connectivity");
    expect(result.vertexAi.productionContract.level).toBe("production-contract");
    expect(result.secretAccessValidated).toBe(true);
  });
});
