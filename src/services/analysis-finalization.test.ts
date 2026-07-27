import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessingRunSchema, ReviewDecisionSchema, StoredAnalysisSchema } from "@/domain/schemas";
import { LocalFileRepository } from "@/persistence/local";
import { MemoryRepository } from "@/persistence/memory";
import {
  AnalysisFinalizationIntegrityError,
  type AnalysisFinalizationInput,
  type RadarRepository,
} from "@/persistence/repository";
import { analysisFixture, sourceFixture } from "@/test/fixtures";
import {
  MAX_PERSISTENCE_RETRIES,
  PERSISTENCE_BASE_BACKOFF_MS,
  STALE_PROCESSING_RUN_THRESHOLD_MS,
  atomicAnalysisFinalizationEnabled,
  finalizeAnalysisWithRetry,
  reconcileStaleProcessingRuns,
} from "./analysis-finalization";

const localPath = ".data/lafryhi-phase43-contract.json";
const startedAt = "2026-07-27T00:00:00.000Z";
const completedAt = "2026-07-27T00:00:10.000Z";
const nowMs = Date.parse("2026-07-27T01:00:00.000Z");

function finalizationInput(runId = "run-phase43"): AnalysisFinalizationInput {
  const processingRun = ProcessingRunSchema.parse({
    id: runId,
    sourceRecordId: sourceFixture.id,
    status: "pending_review",
    model: "deterministic-test-model",
    modelProvider: "vertex-ai",
    startedAt,
    completedAt,
    latencyMs: 10_000,
    promptVersion: "radar-decision-intelligence-v2",
    estimatedCostUsd: null,
    validationOutcome: "passed",
    errorDetails: null,
    retryCount: 0,
  });
  const analysis = StoredAnalysisSchema.parse({
    ...analysisFixture,
    id: `analysis-${runId}`,
    sourceRecordId: sourceFixture.id,
    processingRunId: runId,
    createdAt: completedAt,
  });
  const pendingReview = ReviewDecisionSchema.parse({
    id: `review-${analysis.id}`,
    analysisResultId: analysis.id,
    status: "pending",
    reviewerNote: "",
    reviewedAt: null,
  });
  return { processingRun, analysis, pendingReview };
}

function processingVersion(input: AnalysisFinalizationInput) {
  return ProcessingRunSchema.parse({
    ...input.processingRun,
    status: "processing",
    completedAt: null,
    latencyMs: null,
    validationOutcome: "not_run",
  });
}

async function seed(repository: RadarRepository, input = finalizationInput()) {
  await repository.saveSource(sourceFixture);
  await repository.saveRun(processingVersion(input));
  return input;
}

describe("atomic analysis finalization contract", () => {
  beforeEach(async () => {
    process.env.ATOMIC_ANALYSIS_FINALIZATION_ENABLED = "true";
    await rm(localPath, { force: true });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env.ATOMIC_ANALYSIS_FINALIZATION_ENABLED;
    await rm(localPath, { force: true });
  });

  it.each([
    ["memory", () => new MemoryRepository()],
    ["local", () => new LocalFileRepository(localPath)],
  ])("finalizes successfully and idempotently in the %s adapter", async (_name, factory) => {
    const repository = factory();
    const input = await seed(repository);
    const first = await repository.finalizeAnalysisForReview(input);
    expect(first).toMatchObject({ idempotent: false, reconciled: false });
    expect(await repository.getRun(input.processingRun.id)).toEqual(input.processingRun);
    expect(await repository.getAnalysis(input.analysis.id)).toEqual(input.analysis);
    expect(await repository.getReviewForAnalysis(input.analysis.id)).toEqual(input.pendingReview);

    const second = await repository.finalizeAnalysisForReview(input);
    expect(second).toMatchObject({ idempotent: true, reconciled: false });
    expect(await repository.listAnalyses()).toHaveLength(1);
    expect(await repository.listReviews()).toHaveLength(1);
  });

  it.each([
    ["analysis", async (repository: RadarRepository, input: AnalysisFinalizationInput) => {
      await repository.saveAnalysis({ ...input.analysis, summary: "A conflicting summary that remains valid but must never overwrite the deterministic record." });
    }],
    ["review", async (repository: RadarRepository, input: AnalysisFinalizationInput) => {
      await repository.saveReview({ ...input.pendingReview, reviewerNote: "Conflicting pending note." });
    }],
  ])("rejects conflicting deterministic %s without overwrite", async (_kind, arrange) => {
    const repository = new MemoryRepository();
    const input = await seed(repository);
    await arrange(repository, input);
    await expect(repository.finalizeAnalysisForReview(input)).rejects.toThrow(AnalysisFinalizationIntegrityError);
    expect((await repository.getRun(input.processingRun.id))?.status).toBe("processing");
  });

  it("rejects invalid run state", async () => {
    const repository = new MemoryRepository();
    const input = finalizationInput();
    await repository.saveSource(sourceFixture);
    await repository.saveRun({ ...processingVersion(input), status: "failed", completedAt, latencyMs: 1, validationOutcome: "failed" });
    await expect(repository.finalizeAnalysisForReview(input)).rejects.toThrow("not processing");
  });

  it("rejects source/run and analysis/review linkage mismatches", async () => {
    const repository = new MemoryRepository();
    const input = await seed(repository);
    await expect(repository.finalizeAnalysisForReview({
      ...input,
      analysis: { ...input.analysis, sourceRecordId: "other-source" },
    })).rejects.toThrow("linkage");
    await expect(repository.finalizeAnalysisForReview({
      ...input,
      pendingReview: { ...input.pendingReview, analysisResultId: "other-analysis" },
    })).rejects.toThrow("linkage");
  });

  it.each(["before_writes", "between_writes"] as const)(
    "leaves no partial state when a transaction fails at %s",
    async (failureStage) => {
      class FailingRepository extends MemoryRepository {
        protected override async analysisFinalizationCheckpoint(stage: "before_writes" | "between_writes" | "before_commit") {
          if (stage === failureStage) throw Object.assign(new Error("transaction failed"), { status: 400 });
        }
      }
      const repository = new FailingRepository();
      const input = await seed(repository);
      await expect(repository.finalizeAnalysisForReview(input)).rejects.toThrow("transaction failed");
      expect(await repository.getAnalysis(input.analysis.id)).toBeNull();
      expect(await repository.getReviewForAnalysis(input.analysis.id)).toBeNull();
      expect((await repository.getRun(input.processingRun.id))?.status).toBe("processing");
    },
  );

  it("retries a transient persistence failure and then succeeds", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = new MemoryRepository();
    const input = await seed(repository);
    const original = repository.finalizeAnalysisForReview.bind(repository);
    const finalize = vi.spyOn(repository, "finalizeAnalysisForReview")
      .mockRejectedValueOnce(Object.assign(new Error("temporary"), { code: "UNAVAILABLE" }))
      .mockImplementation(original);
    const sleep = vi.fn(async (milliseconds: number) => { void milliseconds; });
    const result = await finalizeAnalysisWithRetry(repository, input, { sleep, now: () => nowMs });
    expect(result.idempotent).toBe(false);
    expect(finalize).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(PERSISTENCE_BASE_BACKOFF_MS);
    const events = info.mock.calls.map(([value]) => JSON.parse(String(value)));
    expect(events.map(({ action }) => action)).toEqual([
      "finalization_started",
      "persistence_retry_started",
      "persistence_retry_completed",
      "finalization_committed",
    ]);
    expect(JSON.stringify(events)).not.toMatch(/article|evidence|gemini|prompt|credential|secret|temporary/i);
  });

  it("handles client disconnect after commit idempotently", async () => {
    const repository = new MemoryRepository();
    const input = await seed(repository);
    const original = repository.finalizeAnalysisForReview.bind(repository);
    vi.spyOn(repository, "finalizeAnalysisForReview")
      .mockImplementationOnce(async (value) => {
        await original(value);
        throw Object.assign(new Error("client disconnected"), { code: "ECONNRESET" });
      })
      .mockImplementation(original);
    const result = await finalizeAnalysisWithRetry(repository, input, {
      sleep: async () => undefined,
      now: () => nowMs,
    });
    expect(result.idempotent).toBe(true);
    expect(await repository.listAnalyses()).toHaveLength(1);
    expect(await repository.listReviews()).toHaveLength(1);
  });

  it("exhausts bounded persistence retries", async () => {
    const repository = new MemoryRepository();
    const input = await seed(repository);
    const finalize = vi.spyOn(repository, "finalizeAnalysisForReview")
      .mockRejectedValue(Object.assign(new Error("unavailable"), { code: 14 }));
    const sleep = vi.fn(async (milliseconds: number) => { void milliseconds; });
    await expect(finalizeAnalysisWithRetry(repository, input, { sleep, now: () => nowMs }))
      .rejects.toMatchObject({ category: "persistence_transient", retryCount: MAX_PERSISTENCE_RETRIES });
    expect(finalize).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([100, 200]);
  });

  it("never retries an integrity conflict", async () => {
    const repository = new MemoryRepository();
    const input = await seed(repository);
    await repository.saveAnalysis({ ...input.analysis, summary: "A conflicting valid summary that prevents finalization without any retry." });
    const finalize = vi.spyOn(repository, "finalizeAnalysisForReview");
    const sleep = vi.fn(async () => undefined);
    await expect(finalizeAnalysisWithRetry(repository, input, { sleep, now: () => nowMs }))
      .rejects.toThrow(AnalysisFinalizationIntegrityError);
    expect(finalize).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("reconciles a stale run with exact analysis and review records", async () => {
    const repository = new MemoryRepository();
    const input = await seed(repository);
    await repository.saveAnalysis(input.analysis);
    await repository.saveReview(input.pendingReview);
    const outcomes = await reconcileStaleProcessingRuns(repository, { now: () => nowMs, sleep: async () => undefined });
    expect(outcomes).toEqual([{ runId: input.processingRun.id, status: "reconciled" }]);
    expect((await repository.getRun(input.processingRun.id))?.status).toBe("pending_review");
  });

  it("marks a stale run with no final records as eligible without mutation", async () => {
    const repository = new MemoryRepository();
    const input = await seed(repository);
    const outcomes = await reconcileStaleProcessingRuns(repository, { now: () => nowMs });
    expect(outcomes).toEqual([{ runId: input.processingRun.id, status: "eligible_for_recovery" }]);
    expect((await repository.getRun(input.processingRun.id))?.status).toBe("processing");
  });

  it.each(["analysis_only", "review_only", "conflicting"] as const)(
    "classifies stale %s state as an integrity failure without deletion",
    async (state) => {
      const repository = new MemoryRepository();
      const input = await seed(repository);
      if (state !== "review_only") await repository.saveAnalysis(input.analysis);
      if (state === "conflicting") {
        await repository.saveAnalysis({
          ...input.analysis,
          id: "conflicting-analysis",
          summary: "A second run-linked analysis record that must remain available for inspection.",
        });
      }
      if (state !== "analysis_only") await repository.saveReview(input.pendingReview);
      const outcomes = await reconcileStaleProcessingRuns(repository, { now: () => nowMs });
      expect(outcomes).toEqual([{ runId: input.processingRun.id, status: "integrity_failure" }]);
      expect((await repository.getRun(input.processingRun.id))?.status).toBe("processing");
      expect(await repository.listAnalyses()).toHaveLength(state === "review_only" ? 0 : state === "conflicting" ? 2 : 1);
      expect(await repository.listReviews()).toHaveLength(state === "analysis_only" ? 0 : 1);
    },
  );

  it("does nothing when the feature flag is disabled", async () => {
    delete process.env.ATOMIC_ANALYSIS_FINALIZATION_ENABLED;
    const repository = new MemoryRepository();
    await seed(repository);
    expect(atomicAnalysisFinalizationEnabled()).toBe(false);
    expect(await reconcileStaleProcessingRuns(repository, { now: () => nowMs })).toEqual([]);
  });

  it("uses the approved fixed stale threshold", () => {
    expect(STALE_PROCESSING_RUN_THRESHOLD_MS).toBe(900_000);
  });
});
