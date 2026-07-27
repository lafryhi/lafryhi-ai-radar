import { ProcessingRunSchema } from "@/domain/schemas";
import {
  AnalysisFinalizationIntegrityError,
  type AnalysisFinalizationInput,
  type AnalysisFinalizationResult,
  type RadarRepository,
} from "@/persistence/repository";
import { logAnalysisPersistence } from "./pipeline-events";

export const MAX_PERSISTENCE_RETRIES = 2;
export const PERSISTENCE_BASE_BACKOFF_MS = 100;
export const STALE_PROCESSING_RUN_THRESHOLD_MS = 15 * 60 * 1000;

export function atomicAnalysisFinalizationEnabled(value: string | undefined = process.env.ATOMIC_ANALYSIS_FINALIZATION_ENABLED) {
  return value === "true";
}

export type PersistenceFailureCategory = "persistence_transient" | "persistence_permanent";

export class PersistenceFailure extends Error {
  retryCount = 0;
  constructor(readonly category: PersistenceFailureCategory) {
    super(category === "persistence_transient"
      ? "Analysis persistence failed temporarily."
      : "Analysis persistence failed permanently.");
    this.name = "PersistenceFailure";
  }
}

const TEMPORARY_PERSISTENCE_CODES = new Set([
  "ABORTED", "DEADLINE_EXCEEDED", "RESOURCE_EXHAUSTED", "UNAVAILABLE",
  "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENETUNREACH",
]);
const TEMPORARY_GRPC_CODES = new Set([4, 8, 10, 14]);

export function classifyPersistenceFailure(error: unknown) {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const status = typeof record.status === "number"
    ? record.status
    : typeof record.statusCode === "number"
      ? record.statusCode
      : null;
  const code = typeof record.code === "string" || typeof record.code === "number" ? record.code : null;
  const cause = record.cause && typeof record.cause === "object"
    ? record.cause as Record<string, unknown>
    : {};
  const causeCode = typeof cause.code === "string" ? cause.code : null;
  const transient = status === 429 || (status !== null && status >= 500 && status <= 599)
    || (typeof code === "string" && TEMPORARY_PERSISTENCE_CODES.has(code))
    || (typeof code === "number" && TEMPORARY_GRPC_CODES.has(code))
    || (causeCode !== null && TEMPORARY_PERSISTENCE_CODES.has(causeCode));
  return new PersistenceFailure(transient ? "persistence_transient" : "persistence_permanent");
}

export interface FinalizationRuntime {
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
}

export async function finalizeAnalysisWithRetry(
  repository: RadarRepository,
  input: AnalysisFinalizationInput,
  runtime: FinalizationRuntime = {},
): Promise<AnalysisFinalizationResult> {
  const sleep = runtime.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const now = runtime.now ?? Date.now;
  const started = now();
  let retryCount = 0;
  let retryInProgress = false;
  logAnalysisPersistence({
    action: "finalization_started",
    runId: input.processingRun.id,
    analysisId: input.analysis.id,
    reviewId: input.pendingReview.id,
    attemptNumber: 1,
    persistenceRetryCount: 0,
    elapsedMs: 0,
    atomicFinalizationEnabled: true,
    failureCategory: null,
  });

  while (true) {
    const attemptNumber = retryCount + 1;
    try {
      const result = await repository.finalizeAnalysisForReview(input);
      if (retryInProgress) {
        logAnalysisPersistence({
          action: "persistence_retry_completed",
          runId: input.processingRun.id,
          analysisId: input.analysis.id,
          reviewId: input.pendingReview.id,
          attemptNumber,
          persistenceRetryCount: retryCount,
          elapsedMs: Math.max(0, now() - started),
          atomicFinalizationEnabled: true,
          failureCategory: null,
        });
      }
      logAnalysisPersistence({
        action: result.idempotent ? "finalization_idempotent" : "finalization_committed",
        runId: input.processingRun.id,
        analysisId: input.analysis.id,
        reviewId: input.pendingReview.id,
        attemptNumber,
        persistenceRetryCount: retryCount,
        elapsedMs: Math.max(0, now() - started),
        atomicFinalizationEnabled: true,
        failureCategory: null,
      });
      return result;
    } catch (error) {
      if (error instanceof AnalysisFinalizationIntegrityError) {
        logAnalysisPersistence({
          action: "finalization_conflict",
          runId: input.processingRun.id,
          analysisId: input.analysis.id,
          reviewId: input.pendingReview.id,
          attemptNumber,
          persistenceRetryCount: retryCount,
          elapsedMs: Math.max(0, now() - started),
          atomicFinalizationEnabled: true,
          failureCategory: "persistence_integrity",
        });
        throw error;
      }
      const failure = classifyPersistenceFailure(error);
      failure.retryCount = retryCount;
      if (retryInProgress) {
        logAnalysisPersistence({
          action: "persistence_retry_completed",
          runId: input.processingRun.id,
          analysisId: input.analysis.id,
          reviewId: input.pendingReview.id,
          attemptNumber,
          persistenceRetryCount: retryCount,
          elapsedMs: Math.max(0, now() - started),
          atomicFinalizationEnabled: true,
          failureCategory: failure.category,
        });
        retryInProgress = false;
      }
      if (failure.category === "persistence_transient" && retryCount < MAX_PERSISTENCE_RETRIES) {
        retryCount += 1;
        failure.retryCount = retryCount;
        retryInProgress = true;
        logAnalysisPersistence({
          action: "persistence_retry_started",
          runId: input.processingRun.id,
          analysisId: input.analysis.id,
          reviewId: input.pendingReview.id,
          attemptNumber: retryCount + 1,
          persistenceRetryCount: retryCount,
          elapsedMs: Math.max(0, now() - started),
          atomicFinalizationEnabled: true,
          failureCategory: failure.category,
        });
        await sleep(PERSISTENCE_BASE_BACKOFF_MS * (2 ** (retryCount - 1)));
        continue;
      }
      failure.retryCount = retryCount;
      logAnalysisPersistence({
        action: "recovery_exhausted",
        runId: input.processingRun.id,
        analysisId: input.analysis.id,
        reviewId: input.pendingReview.id,
        attemptNumber,
        persistenceRetryCount: retryCount,
        elapsedMs: Math.max(0, now() - started),
        atomicFinalizationEnabled: true,
        failureCategory: failure.category,
      });
      throw failure;
    }
  }
}

export type StaleRunOutcome =
  | { runId: string; status: "reconciled" }
  | { runId: string; status: "eligible_for_recovery" }
  | { runId: string; status: "integrity_failure" };

export async function reconcileStaleProcessingRuns(
  repository: RadarRepository,
  runtime: FinalizationRuntime = {},
  thresholdMs = STALE_PROCESSING_RUN_THRESHOLD_MS,
): Promise<StaleRunOutcome[]> {
  if (!atomicAnalysisFinalizationEnabled()) return [];
  const now = runtime.now ?? Date.now;
  const nowMs = now();
  const [runs, analyses, reviews] = await Promise.all([
    repository.listRuns(100),
    repository.listAnalyses(100),
    repository.listReviews(100),
  ]);
  const staleRuns = runs.filter((run) =>
    run.status === "processing" && nowMs - Date.parse(run.startedAt) >= thresholdMs);
  const outcomes: StaleRunOutcome[] = [];

  for (const run of staleRuns) {
    const expectedAnalysisId = `analysis-${run.id}`;
    const expectedReviewId = `review-${expectedAnalysisId}`;
    logAnalysisPersistence({
      action: "stale_run_detected",
      runId: run.id,
      analysisId: expectedAnalysisId,
      reviewId: expectedReviewId,
      attemptNumber: 1,
      persistenceRetryCount: 0,
      elapsedMs: 0,
      atomicFinalizationEnabled: true,
      failureCategory: null,
    });
    const [directAnalysis, directReview] = await Promise.all([
      repository.getAnalysis(expectedAnalysisId),
      repository.getReviewForAnalysis(expectedAnalysisId),
    ]);
    const candidateAnalysisMap = new Map(analyses
      .filter((analysis) => analysis.id === expectedAnalysisId || analysis.processingRunId === run.id)
      .map((analysis) => [analysis.id, analysis] as const));
    if (directAnalysis) candidateAnalysisMap.set(directAnalysis.id, directAnalysis);
    const candidateAnalyses = [...candidateAnalysisMap.values()];
    const candidateAnalysisIds = new Set(candidateAnalyses.map((analysis) => analysis.id));
    const candidateReviewMap = new Map(reviews.filter((review) =>
      review.id === expectedReviewId
      || review.analysisResultId === expectedAnalysisId
      || candidateAnalysisIds.has(review.analysisResultId))
      .map((review) => [review.id, review] as const));
    if (directReview) candidateReviewMap.set(directReview.id, directReview);
    const candidateReviews = [...candidateReviewMap.values()];

    if (candidateAnalyses.length === 0 && candidateReviews.length === 0) {
      logAnalysisPersistence({
        action: "stale_run_recovery_eligible",
        runId: run.id,
        analysisId: expectedAnalysisId,
        reviewId: expectedReviewId,
        attemptNumber: 1,
        persistenceRetryCount: 0,
        elapsedMs: 0,
        atomicFinalizationEnabled: true,
        failureCategory: null,
      });
      outcomes.push({ runId: run.id, status: "eligible_for_recovery" });
      continue;
    }

    const analysis = candidateAnalyses.length === 1 ? candidateAnalyses[0] : null;
    const review = candidateReviews.length === 1 ? candidateReviews[0] : null;
    const exactPair = analysis?.id === expectedAnalysisId
      && run.model !== "pending"
      && analysis.processingRunId === run.id
      && analysis.sourceRecordId === run.sourceRecordId
      && review?.id === expectedReviewId
      && review.analysisResultId === expectedAnalysisId
      && review.status === "pending"
      && review.reviewerNote === ""
      && review.reviewedAt === null;
    if (!exactPair || !analysis || !review) {
      logAnalysisPersistence({
        action: "partial_state_integrity_failure",
        runId: run.id,
        analysisId: expectedAnalysisId,
        reviewId: expectedReviewId,
        attemptNumber: 1,
        persistenceRetryCount: 0,
        elapsedMs: 0,
        atomicFinalizationEnabled: true,
        failureCategory: "persistence_integrity",
      });
      outcomes.push({ runId: run.id, status: "integrity_failure" });
      continue;
    }

    const completedRun = ProcessingRunSchema.parse({
      ...run,
      status: "pending_review",
      completedAt: new Date(nowMs).toISOString(),
      latencyMs: Math.max(0, nowMs - Date.parse(run.startedAt)),
      validationOutcome: "passed",
      errorDetails: null,
    });
    try {
      await finalizeAnalysisWithRetry(repository, {
        processingRun: completedRun,
        analysis,
        pendingReview: review,
      }, runtime);
    } catch (error) {
      if (!(error instanceof AnalysisFinalizationIntegrityError)) throw error;
      logAnalysisPersistence({
        action: "partial_state_integrity_failure",
        runId: run.id,
        analysisId: expectedAnalysisId,
        reviewId: expectedReviewId,
        attemptNumber: 1,
        persistenceRetryCount: 0,
        elapsedMs: 0,
        atomicFinalizationEnabled: true,
        failureCategory: "persistence_integrity",
      });
      outcomes.push({ runId: run.id, status: "integrity_failure" });
      continue;
    }
    logAnalysisPersistence({
      action: "stale_run_reconciled",
      runId: run.id,
      analysisId: analysis.id,
      reviewId: review.id,
      attemptNumber: 1,
      persistenceRetryCount: 0,
      elapsedMs: 0,
      atomicFinalizationEnabled: true,
      failureCategory: null,
    });
    outcomes.push({ runId: run.id, status: "reconciled" });
  }

  return outcomes;
}
