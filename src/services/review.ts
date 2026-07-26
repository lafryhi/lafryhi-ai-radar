import { ReviewDecisionSchema } from "@/domain/schemas";
import { ApprovalIntegrityError, type RadarRepository } from "@/persistence/repository";
import { logOperatorEvent } from "./operator-events";

export class ReviewActionError extends Error {
  constructor(message: string, readonly statusCode: 400 | 404 | 409) { super(message); }
}

export async function reviewAnalysis(repository: RadarRepository, analysisId: string, status: "approved" | "rejected", note: string) {
  if (status === "approved") {
    try {
      const result = await repository.approveReviewAndPublish(analysisId, note, new Date().toISOString());
      if (!result.idempotent) {
        logOperatorEvent({ event: "operator.review_approved", reviewId: result.decision.id, analysisId, sourceId: result.item.sourceRecordId, runId: result.item.processingRunId, radarItemId: result.item.id, previousStatus: "pending", resultingStatus: "approved", action: "approve" });
      }
      return result;
    } catch (error) {
      if (error instanceof ApprovalIntegrityError) throw new ReviewActionError(error.message, 409);
      throw error;
    }
  }
  const analysis = await repository.getAnalysis(analysisId);
  if (!analysis) throw new ReviewActionError("Analysis not found.", 404);
  const current = await repository.getReviewForAnalysis(analysisId);
  if (!current) throw new ReviewActionError("Review record not found.", 404);
  const source = await repository.getSource(analysis.sourceRecordId);
  if (!source) throw new ReviewActionError("Source provenance not found.", 404);
  if (current.status === status) {
    if (status === "rejected") return { decision: current, item: null, idempotent: true };
  }
  if (!["pending", "needs_changes"].includes(current.status)) {
    logOperatorEvent({ event: "operator.review_conflict", reviewId: current.id, analysisId, sourceId: source.id, runId: analysis.processingRunId, previousStatus: current.status, action: "reject", reason: "invalid_transition" }, "warn");
    throw new ReviewActionError("The review state changed. Refresh before taking another action.", 409);
  }
  if (status === "rejected" && note.trim().length < 5) throw new ReviewActionError("A rejection reason of at least 5 characters is required.", 400);
  const reviewedAt = new Date().toISOString();
  const decision = ReviewDecisionSchema.parse({ ...current, status, reviewerNote: note.trim(), reviewedAt });
  await repository.saveReview(decision);
  if (status === "rejected") {
    logOperatorEvent({ event: "operator.review_rejected", reviewId: decision.id, analysisId, sourceId: source.id, runId: analysis.processingRunId, previousStatus: current.status, resultingStatus: "rejected", action: "reject" });
    return { decision, item: null, idempotent: false };
  }
  return { decision, item: null, idempotent: false };
}
