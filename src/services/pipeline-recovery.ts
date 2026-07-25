import { z } from "zod";
import { logPipelineCompleted, logPipelineValidationRejected } from "./pipeline-events";

const RecoveryRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("rerun"),
    sourceRecordId: z.string().uuid(),
  }).strict(),
  z.object({
    action: z.literal("validate_completion_log"),
    processingMode: z.literal("rerun"),
  }).strict(),
]);

export interface PipelineRecoveryDependencies {
  rerun(sourceRecordId: string): Promise<void>;
}

export type PipelineRecoveryResult =
  | { ok: true; status: 200; kind: "rerun_started" | "synthetic_validation" }
  | { ok: false; status: 400; error: "Invalid recovery request." };

export async function handlePipelineRecovery(
  input: unknown,
  dependencies: PipelineRecoveryDependencies,
): Promise<PipelineRecoveryResult> {
  const parsed = RecoveryRequestSchema.safeParse(input);
  if (!parsed.success) {
    logPipelineValidationRejected();
    return { ok: false, status: 400, error: "Invalid recovery request." };
  }

  if (parsed.data.action === "validate_completion_log") {
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
    return { ok: true, status: 200, kind: "synthetic_validation" };
  }

  await dependencies.rerun(parsed.data.sourceRecordId);
  return { ok: true, status: 200, kind: "rerun_started" };
}
