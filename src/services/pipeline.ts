import { randomUUID } from "node:crypto";
import { ProcessingRunSchema, ReviewDecisionSchema, StoredAnalysisSchema, type ProcessingRun } from "@/domain/schemas";
import type { RadarRepository } from "@/persistence/repository";
import type { AiAnalyzer, PreviousArticleContext } from "./ai";
import { PROMPT_VERSION } from "./ai";
import { aiRecoveryEnabled, AnalysisFailure } from "./failure-recovery";
import {
  atomicAnalysisFinalizationEnabled,
  finalizeAnalysisWithRetry,
} from "./analysis-finalization";
import { ingestSource, validateRegisteredSource, validateSourceUrl } from "./ingestion";
import { logAnalysisCreated, logPendingReviewCreated, logPipelineCompleted, logPipelineStarted } from "./pipeline-events";

interface PipelineContext {
  candidateId?: string;
}

function failedValidationOutcome(error: unknown) {
  if (!atomicAnalysisFinalizationEnabled()) return "failed" as const;
  if (!(error instanceof AnalysisFailure)) return "not_run" as const;
  return ["response_envelope", "schema_validation", "evidence_integrity", "duplicate_integrity", "empty_output", "response_truncated"]
    .includes(error.category) ? "failed" as const : "not_run" as const;
}

async function getPreviousCoverage(repository: RadarRepository): Promise<PreviousArticleContext[]> {
  const [analyses, sources] = await Promise.all([
    repository.listAnalyses(30),
    repository.listSources(30),
  ]);
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  return analyses.flatMap((analysis): PreviousArticleContext[] => {
    const source = sourceById.get(analysis.sourceRecordId);
    if (!source) return [];
    return [{
      sourceRecordId: source.id,
      title: source.title,
      sourceUrl: source.sourceUrl,
      publishedAt: source.publishedAt,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      relatedTopics: analysis.relatedTopics,
      entities: analysis.entities.map(({ normalizedName, type }) => ({ normalizedName, type })),
    }];
  }).slice(0, 20);
}

export async function runPipeline(url: string, repository: RadarRepository, analyzer: AiAnalyzer, fetcher: typeof fetch = fetch, context: PipelineContext = {}) {
  const started = Date.now();
  let run: ProcessingRun | undefined;
  try {
    const source = await ingestSource(url, repository, fetcher);
    await repository.saveSource(source);
    run = ProcessingRunSchema.parse({
      id: randomUUID(), sourceRecordId: source.id, status: "processing",
      model: "pending", modelProvider: "vertex-ai", startedAt: new Date(started).toISOString(),
      completedAt: null, latencyMs: null, promptVersion: PROMPT_VERSION,
      estimatedCostUsd: null, validationOutcome: "not_run", errorDetails: null, retryCount: 0,
    });
    await repository.saveRun(run);
    logPipelineStarted({ processingRunId: run.id, candidateId: context.candidateId, sourceId: source.id });
    const output = await analyzer.analyze(source, { previousArticles: await getPreviousCoverage(repository) });
    const atomicFinalization = atomicAnalysisFinalizationEnabled();
    run = ProcessingRunSchema.parse({
      ...run,
      retryCount: output.retryCount ?? run.retryCount,
      ...(atomicFinalization ? { model: output.model, tokenUsage: output.tokenUsage } : {}),
    });
    const analysisId = atomicFinalization ? `analysis-${run.id}` : randomUUID();
    const analysis = StoredAnalysisSchema.parse({
      ...output.result, id: analysisId, sourceRecordId: source.id,
      processingRunId: run.id, createdAt: new Date().toISOString(),
    });
    const review = ReviewDecisionSchema.parse({
      id: atomicFinalization ? `review-${analysis.id}` : randomUUID(),
      analysisResultId: analysis.id, status: "pending", reviewerNote: "", reviewedAt: null,
    });
    const completed = ProcessingRunSchema.parse({
      ...run, status: "pending_review", model: output.model, completedAt: new Date().toISOString(),
      latencyMs: Date.now() - started, tokenUsage: output.tokenUsage,
      validationOutcome: "passed",
    });
    if (atomicFinalization) {
      await finalizeAnalysisWithRetry(repository, { processingRun: completed, analysis, pendingReview: review });
      logAnalysisCreated({ analysisId: analysis.id, processingRunId: run.id, candidateId: context.candidateId, model: output.model });
      logPendingReviewCreated({ reviewId: review.id, analysisId: analysis.id, status: "pending" });
    } else {
      await repository.saveAnalysis(analysis);
      logAnalysisCreated({ analysisId: analysis.id, processingRunId: run.id, candidateId: context.candidateId, model: output.model });
      await repository.saveReview(review);
      logPendingReviewCreated({ reviewId: review.id, analysisId: analysis.id, status: "pending" });
      await repository.saveRun(completed);
    }
    logPipelineCompleted({
      executionKind: "production",
      sourceId: source.id,
      runId: completed.id,
      analysisId: analysis.id,
      processingMode: "initial",
      model: output.model,
      schemaValidationStatus: "passed",
      persistenceStatus: "persisted",
      reviewStatus: "pending",
      totalLatencyMs: completed.latencyMs ?? 0,
    });
    return { source, run: completed, analysis };
  } catch (error) {
    if (run) {
      const failed = ProcessingRunSchema.parse({ ...run, status: "failed", completedAt: new Date().toISOString(), latencyMs: Date.now() - started, validationOutcome: failedValidationOutcome(error), errorDetails: error instanceof Error ? error.message.slice(0, 2000) : "Unknown processing error", retryCount: error instanceof AnalysisFailure ? error.retryCount : run.retryCount });
      await repository.saveRun(failed);
      console.error(JSON.stringify({ event: "pipeline.failed", runId: run.id, error: failed.errorDetails }));
    }
    throw error;
  }
}

export async function rerunPipeline(sourceRecordId: string, repository: RadarRepository, analyzer: AiAnalyzer) {
  const source = (await repository.listSources()).find((x) => x.id === sourceRecordId);
  if (!source) throw new Error("Source record not found.");
  await validateRegisteredSource(validateSourceUrl(source.sourceUrl), repository);
  const started = Date.now();
  const previousRetries = (await repository.listRuns()).filter((x) => x.sourceRecordId === sourceRecordId).length;
  let run = ProcessingRunSchema.parse({
    id: randomUUID(), sourceRecordId, status: "processing", model: "pending",
    modelProvider: "vertex-ai", startedAt: new Date(started).toISOString(), completedAt: null,
    latencyMs: null, promptVersion: PROMPT_VERSION, estimatedCostUsd: null,
    validationOutcome: "not_run", errorDetails: null, retryCount: aiRecoveryEnabled() ? 0 : previousRetries,
  });
  await repository.saveRun(run);
  logPipelineStarted({ processingRunId: run.id, sourceId: source.id });
  try {
    const output = await analyzer.analyze(source, { previousArticles: await getPreviousCoverage(repository) });
    const atomicFinalization = atomicAnalysisFinalizationEnabled();
    run = ProcessingRunSchema.parse({
      ...run,
      retryCount: output.retryCount ?? run.retryCount,
      ...(atomicFinalization ? { model: output.model, tokenUsage: output.tokenUsage } : {}),
    });
    const analysis = StoredAnalysisSchema.parse({ ...output.result, id: atomicFinalization ? `analysis-${run.id}` : randomUUID(), sourceRecordId, processingRunId: run.id, createdAt: new Date().toISOString() });
    const review = ReviewDecisionSchema.parse({ id: atomicFinalization ? `review-${analysis.id}` : randomUUID(), analysisResultId: analysis.id, status: "pending", reviewerNote: "", reviewedAt: null });
    run = ProcessingRunSchema.parse({ ...run, status: "pending_review", model: output.model, completedAt: new Date().toISOString(), latencyMs: Date.now() - started, tokenUsage: output.tokenUsage, validationOutcome: "passed" });
    if (atomicFinalization) {
      await finalizeAnalysisWithRetry(repository, { processingRun: run, analysis, pendingReview: review });
      logAnalysisCreated({ analysisId: analysis.id, processingRunId: run.id, model: output.model });
      logPendingReviewCreated({ reviewId: review.id, analysisId: analysis.id, status: "pending" });
    } else {
      await repository.saveAnalysis(analysis);
      logAnalysisCreated({ analysisId: analysis.id, processingRunId: run.id, model: output.model });
      await repository.saveReview(review);
      logPendingReviewCreated({ reviewId: review.id, analysisId: analysis.id, status: "pending" });
      await repository.saveRun(run);
    }
    logPipelineCompleted({
      executionKind: "production",
      sourceId: source.id,
      runId: run.id,
      analysisId: analysis.id,
      processingMode: "rerun",
      model: output.model,
      schemaValidationStatus: "passed",
      persistenceStatus: "persisted",
      reviewStatus: "pending",
      totalLatencyMs: run.latencyMs ?? 0,
    });
    return { source, run, analysis };
  } catch (error) {
    run = ProcessingRunSchema.parse({ ...run, status: "failed", completedAt: new Date().toISOString(), latencyMs: Date.now() - started, validationOutcome: failedValidationOutcome(error), errorDetails: error instanceof Error ? error.message.slice(0, 2000) : "Unknown processing error", retryCount: error instanceof AnalysisFailure ? error.retryCount : run.retryCount });
    await repository.saveRun(run);
    throw error;
  }
}
