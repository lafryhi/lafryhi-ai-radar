import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { MemoryRepository } from "@/persistence/memory";
import { POST } from "@/app/api/internal/pipeline/recovery/route";
import { handlePipelineRecovery } from "./pipeline-recovery";
import { logPipelineCompleted } from "./pipeline-events";

const operatorToken = "checkpoint-8-1-test-operator-token";

describe("pipeline recovery validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPERATOR_ACCESS_TOKEN;
  });

  it("returns HTTP 400 for malformed recovery payloads", async () => {
    process.env.OPERATOR_ACCESS_TOKEN = operatorToken;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await POST(new NextRequest("https://example.test/api/internal/pipeline/recovery", {
      method: "POST",
      headers: { "content-type": "application/json", "x-operator-token": operatorToken },
      body: JSON.stringify({ action: "rerun", sourceRecordId: "not-a-uuid" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid recovery request." });
  });

  it("rejects malformed recovery before Gemini or persistence can run", async () => {
    const repo = new MemoryRepository();
    const invokeGemini = vi.fn();
    const rerun = vi.fn(async () => {
      await invokeGemini();
      throw new Error("Malformed input must never reach recovery dependencies.");
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await handlePipelineRecovery(
      { action: "rerun", sourceRecordId: "invalid", operatorToken: "must-not-be-logged" },
      { rerun },
    );

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(rerun).not.toHaveBeenCalled();
    expect(invokeGemini).not.toHaveBeenCalled();
    expect(await repo.listSources()).toHaveLength(0);
    expect(await repo.listRuns()).toHaveLength(0);
    expect(await repo.listAnalyses()).toHaveLength(0);
  });

  it("never places secret-bearing fields in structured logs", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logPipelineCompleted({
      executionKind: "synthetic_validation",
      sourceId: "diagnostic-nonpersistent",
      runId: "diagnostic-nonpersistent",
      analysisId: "diagnostic-nonpersistent",
      processingMode: "rerun",
      model: "deterministic-diagnostic",
      schemaValidationStatus: "passed",
      persistenceStatus: "not_persisted_diagnostic",
      reviewStatus: "not_applicable",
      totalLatencyMs: 0,
    });

    const serialized = String(info.mock.calls.at(-1)?.[0]);
    expect(serialized).toContain('"event":"pipeline.completed"');
    expect(serialized).not.toMatch(/operatorToken|authorization|credential|secret|rawPrompt|normalizedText/i);
  });

  it("routes a valid stale reconciliation request without invoking rerun", async () => {
    const rerun = vi.fn(async () => undefined);
    const reconcileStale = vi.fn(async () => undefined);
    const result = await handlePipelineRecovery(
      { action: "reconcile_stale" },
      { rerun, reconcileStale },
    );
    expect(result).toEqual({ ok: true, status: 200, kind: "stale_reconciliation" });
    expect(reconcileStale).toHaveBeenCalledOnce();
    expect(rerun).not.toHaveBeenCalled();
  });
});
