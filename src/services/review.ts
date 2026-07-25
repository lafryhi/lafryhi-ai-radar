import { RadarItemSchema, ReviewDecisionSchema } from "@/domain/schemas";
import type { RadarRepository } from "@/persistence/repository";
import { logOperatorEvent } from "./operator-events";

export class ReviewActionError extends Error {
  constructor(message: string, readonly statusCode: 400 | 404 | 409) { super(message); }
}

export async function reviewAnalysis(repository: RadarRepository, analysisId: string, status: "approved" | "rejected", note: string) {
  const analysis = await repository.getAnalysis(analysisId);
  if (!analysis) throw new ReviewActionError("Analysis not found.", 404);
  const current = await repository.getReviewForAnalysis(analysisId);
  if (!current) throw new ReviewActionError("Review record not found.", 404);
  const source = await repository.getSource(analysis.sourceRecordId);
  if (!source) throw new ReviewActionError("Source provenance not found.", 404);
  const existingItem = await repository.findRadarItemByAnalysis(analysisId);

  if (current.status === status) {
    if (status === "approved" && existingItem) return { decision: current, item: existingItem, idempotent: true };
    if (status === "rejected") return { decision: current, item: null, idempotent: true };
  }
  if (!["pending", "needs_changes"].includes(current.status)) {
    logOperatorEvent({ event: "operator.review_conflict", reviewId: current.id, analysisId, sourceId: source.id, runId: analysis.processingRunId, previousStatus: current.status, action: status === "approved" ? "approve" : "reject", reason: "invalid_transition" }, "warn");
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
  const item = RadarItemSchema.parse({
    id: `radar-${analysis.id}`, publicTitle: source.title, publicSummary: analysis.summary,
    whyItMatters: analysis.whyItMatters, recommendedAction: analysis.recommendedAction,
    category: analysis.category, relevanceScore: analysis.relevanceScore,
    confidenceScore: analysis.confidenceScore, originalSourceUrl: source.sourceUrl,
    sourceName: source.sourceName, sourcePublishedAt: source.publishedAt,
    publicationState: "published", sourceRecordId: source.id,
    processingRunId: analysis.processingRunId, analysisResultId: analysis.id,
    reviewDecisionId: decision.id, publishedAt: reviewedAt,
  });
  await repository.saveRadarItem(item);
  logOperatorEvent({ event: "operator.review_approved", reviewId: decision.id, analysisId, sourceId: source.id, runId: analysis.processingRunId, radarItemId: item.id, previousStatus: current.status, resultingStatus: "approved", action: "approve" });
  return { decision, item, idempotent: false };
}
