import { z } from "zod";
import { EvidenceMismatchClassifications } from "./failure-recovery";

const timestamp = z.string().datetime({ offset: true });
const optionalCandidateId = z.string().min(1).optional();

export const PipelineStartedEventSchema = z.object({
  event: z.literal("pipeline.started"),
  processingRunId: z.string().min(1),
  candidateId: optionalCandidateId,
  sourceId: z.string().min(1),
  timestamp,
}).strict();

export const AnalysisCreatedEventSchema = z.object({
  event: z.literal("analysis.created"),
  analysisId: z.string().min(1),
  processingRunId: z.string().min(1),
  candidateId: optionalCandidateId,
  model: z.string().min(1),
  timestamp,
}).strict();

export const ReviewPendingCreatedEventSchema = z.object({
  event: z.literal("review.pending_created"),
  reviewId: z.string().min(1),
  analysisId: z.string().min(1),
  status: z.literal("pending"),
  timestamp,
}).strict();

export const PipelineCompletionEventSchema = z.object({
  event: z.literal("pipeline.completed"),
  executionKind: z.enum(["production", "synthetic_validation"]),
  sourceId: z.string().min(1),
  runId: z.string().min(1),
  analysisId: z.string().min(1),
  processingMode: z.enum(["initial", "rerun"]),
  model: z.string().min(1),
  schemaValidationStatus: z.literal("passed"),
  persistenceStatus: z.enum(["persisted", "not_persisted_diagnostic"]),
  reviewStatus: z.enum(["pending", "not_applicable"]),
  totalLatencyMs: z.number().int().nonnegative(),
  timestamp,
}).strict();

function emit<T>(schema: z.ZodType<T>, event: T) {
  const structured = schema.parse(event);
  console.info(JSON.stringify(structured));
  return structured;
}

export function logPipelineStarted(event: Omit<z.infer<typeof PipelineStartedEventSchema>, "event" | "timestamp">) {
  return emit(PipelineStartedEventSchema, {
    event: "pipeline.started",
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export function logAnalysisCreated(event: Omit<z.infer<typeof AnalysisCreatedEventSchema>, "event" | "timestamp">) {
  return emit(AnalysisCreatedEventSchema, {
    event: "analysis.created",
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export function logPendingReviewCreated(event: Omit<z.infer<typeof ReviewPendingCreatedEventSchema>, "event" | "timestamp">) {
  return emit(ReviewPendingCreatedEventSchema, {
    event: "review.pending_created",
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export type PipelineCompletionEvent = z.infer<typeof PipelineCompletionEventSchema>;

export function logPipelineCompleted(event: Omit<PipelineCompletionEvent, "event" | "timestamp">) {
  return emit(PipelineCompletionEventSchema, {
    event: "pipeline.completed",
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export const PipelineValidationRejectedEventSchema = z.object({
  event: z.literal("pipeline.validation_rejected"),
  endpoint: z.literal("pipeline_recovery"),
  reason: z.literal("invalid_payload"),
  httpStatus: z.literal(400),
  timestamp: z.string().datetime({ offset: true }),
}).strict();

export function logPipelineValidationRejected() {
  const structured = PipelineValidationRejectedEventSchema.parse({
    event: "pipeline.validation_rejected",
    endpoint: "pipeline_recovery",
    reason: "invalid_payload",
    httpStatus: 400,
    timestamp: new Date().toISOString(),
  });
  console.warn(JSON.stringify(structured));
  return structured;
}

export const AiRecoveryEventSchema = z.object({
  event: z.literal("ai.recovery"),
  recoveryType: z.enum(["none", "lossless_repair", "terminal_failure"]),
  retryCount: z.number().int().nonnegative(),
  regenerationCount: z.number().int().nonnegative(),
  repairCount: z.number().int().nonnegative(),
  recoveryDurationMs: z.number().int().nonnegative(),
  terminalFailureCategory: z.enum([
    "response_envelope", "schema_validation", "evidence_integrity", "duplicate_integrity",
    "empty_output", "response_truncated", "provider_transient", "provider_permanent",
    "internal_invariant",
  ]).nullable(),
  repairCode: z.enum([
    "unwrap_json_fence", "trim_string", "deduplicate_string", "deduplicate_entity",
    "deduplicate_related_article", "derive_duplicate_reason", "empty_opportunity_detail_to_null",
  ]).nullable(),
  fieldPath: z.string().max(300).nullable(),
  timestamp,
}).strict();

export function logAiRecovery(event: Omit<z.infer<typeof AiRecoveryEventSchema>, "event" | "timestamp">) {
  return emit(AiRecoveryEventSchema, {
    event: "ai.recovery",
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export const GeminiRecoveryEventSchema = z.object({
  event: z.literal("gemini.recovery"),
  recoveryType: z.enum([
    "provider_retry_started",
    "provider_retry_completed",
    "compact_regeneration_requested",
    "correction_regeneration_requested",
    "recovery_succeeded",
    "recovery_exhausted",
  ]),
  attemptNumber: z.number().int().min(1).max(4),
  retryCount: z.number().int().min(0).max(3),
  regenerationCount: z.number().int().min(0).max(1),
  elapsedRecoveryMs: z.number().int().nonnegative(),
  model: z.string().min(1).max(200),
  promptVersion: z.string().min(1).max(200),
  schemaVersion: z.string().min(1).max(200),
  recoveryEnabled: z.boolean(),
  failureCategory: z.enum([
    "response_envelope", "schema_validation", "evidence_integrity", "duplicate_integrity",
    "empty_output", "response_truncated", "provider_transient", "provider_permanent",
    "internal_invariant",
  ]).nullable(),
  terminalFailureCategory: z.enum([
    "response_envelope", "schema_validation", "evidence_integrity", "duplicate_integrity",
    "empty_output", "response_truncated", "provider_transient", "provider_permanent",
    "internal_invariant",
  ]).nullable(),
  issuePaths: z.array(z.string().max(300)).max(25),
  issueCodes: z.array(z.string().max(100)).max(25),
  evidenceMismatchDiagnostics: z.array(z.object({
    fieldPath: z.string().max(300),
    quoteLength: z.number().int().min(0).max(500),
    longestMatchingPrefixLength: z.number().int().min(0).max(500),
    longestMatchingSuffixLength: z.number().int().min(0).max(500),
    mismatchClassification: z.enum(EvidenceMismatchClassifications),
  }).strict()).max(5),
  timestamp,
}).strict();

export function logGeminiRecovery(event: Omit<z.infer<typeof GeminiRecoveryEventSchema>, "event" | "timestamp">) {
  return emit(GeminiRecoveryEventSchema, {
    event: "gemini.recovery",
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export const AnalysisPersistenceEventSchema = z.object({
  event: z.literal("analysis.persistence"),
  action: z.enum([
    "finalization_started",
    "finalization_committed",
    "finalization_idempotent",
    "finalization_conflict",
    "persistence_retry_started",
    "persistence_retry_completed",
    "stale_run_detected",
    "stale_run_reconciled",
    "stale_run_recovery_eligible",
    "partial_state_integrity_failure",
    "recovery_exhausted",
  ]),
  runId: z.string().min(1).max(200),
  analysisId: z.string().min(1).max(220).nullable(),
  reviewId: z.string().min(1).max(240).nullable(),
  attemptNumber: z.number().int().min(1).max(3),
  persistenceRetryCount: z.number().int().min(0).max(2),
  elapsedMs: z.number().int().nonnegative(),
  atomicFinalizationEnabled: z.boolean(),
  failureCategory: z.enum(["persistence_transient", "persistence_permanent", "persistence_integrity"]).nullable(),
  timestamp,
}).strict();

export function logAnalysisPersistence(event: Omit<z.infer<typeof AnalysisPersistenceEventSchema>, "event" | "timestamp">) {
  return emit(AnalysisPersistenceEventSchema, {
    event: "analysis.persistence",
    ...event,
    timestamp: new Date().toISOString(),
  });
}
