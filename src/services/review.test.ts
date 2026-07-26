import { describe, expect, it } from "vitest";
import type { RadarItem, ReviewDecision } from "@/domain/schemas";
import { MemoryRepository } from "@/persistence/memory";
import { analysisFixture, sourceFixture } from "@/test/fixtures";
import { reviewAnalysis } from "./review";

const analysis = {
  ...analysisFixture,
  id: "analysis-1",
  sourceRecordId: sourceFixture.id,
  processingRunId: "run-1",
  createdAt: "2026-07-27T00:00:00.000Z",
};
const pendingReview: ReviewDecision = {
  id: "review-1",
  analysisResultId: analysis.id,
  status: "pending",
  reviewerNote: "",
  reviewedAt: null,
};

function radarItem(reviewDecisionId = pendingReview.id): RadarItem {
  return {
    id: `radar-${analysis.id}`,
    publicTitle: sourceFixture.title,
    publicSummary: analysis.summary,
    whyItMatters: analysis.whyItMatters,
    recommendedAction: analysis.recommendedAction,
    category: analysis.category,
    relevanceScore: analysis.relevanceScore,
    confidenceScore: analysis.confidenceScore,
    originalSourceUrl: sourceFixture.sourceUrl,
    sourceName: sourceFixture.sourceName,
    sourcePublishedAt: sourceFixture.publishedAt,
    publicationState: "published",
    sourceRecordId: sourceFixture.id,
    processingRunId: analysis.processingRunId,
    analysisResultId: analysis.id,
    reviewDecisionId,
    publishedAt: "2026-07-27T00:01:00.000Z",
  };
}

async function repositoryWith(review = pendingReview) {
  const repository = new MemoryRepository();
  await repository.saveSource(sourceFixture);
  await repository.saveAnalysis(analysis);
  await repository.saveReview(review);
  return repository;
}

async function expectIntegrityError(action: Promise<unknown>, message: string) {
  await expect(action).rejects.toMatchObject({
    statusCode: 409,
    message,
  });
}

describe("atomic review approval and publication", () => {
  it("approves a pending review and publishes exactly one deterministic Radar item", async () => {
    const repository = await repositoryWith();

    const result = await reviewAnalysis(repository, analysis.id, "approved", "Reviewed");

    expect(result.idempotent).toBe(false);
    expect(result.decision.status).toBe("approved");
    expect(result.decision.reviewedAt).not.toBeNull();
    expect(result.item?.id).toBe(`radar-${analysis.id}`);
    expect(await repository.listPublishedItems()).toEqual([result.item]);
  });

  it("leaves no partial write when the atomic commit fails", async () => {
    class FailingCommitRepository extends MemoryRepository {
      protected override async commitApproval(): Promise<void> {
        throw new Error("simulated transaction failure");
      }
    }
    const repository = new FailingCommitRepository();
    await repository.saveSource(sourceFixture);
    await repository.saveAnalysis(analysis);
    await repository.saveReview(pendingReview);

    await expect(reviewAnalysis(repository, analysis.id, "approved", "")).rejects.toThrow("simulated transaction failure");
    expect((await repository.getReviewForAnalysis(analysis.id))?.status).toBe("pending");
    expect(await repository.findRadarItemByAnalysis(analysis.id)).toBeNull();
  });

  it("returns idempotent success for a repeated successful request", async () => {
    const repository = await repositoryWith();
    const first = await reviewAnalysis(repository, analysis.id, "approved", "");

    const second = await reviewAnalysis(repository, analysis.id, "approved", "");

    expect(second.idempotent).toBe(true);
    expect(second.decision).toEqual(first.decision);
    expect(second.item).toEqual(first.item);
    expect(await repository.listPublishedItems()).toHaveLength(1);
  });

  it("rejects duplicate Reviews instead of selecting one", async () => {
    const repository = await repositoryWith();
    await repository.saveReview({ ...pendingReview, id: "review-2" });

    await expectIntegrityError(
      reviewAnalysis(repository, analysis.id, "approved", ""),
      "Approval integrity error: multiple reviews exist for this analysis.",
    );
  });

  it("returns idempotent success for an approved Review with its matching Radar item", async () => {
    const approved = { ...pendingReview, status: "approved" as const, reviewedAt: "2026-07-27T00:01:00.000Z" };
    const repository = await repositoryWith(approved);
    await repository.saveRadarItem(radarItem());

    const result = await reviewAnalysis(repository, analysis.id, "approved", "");

    expect(result.idempotent).toBe(true);
    expect(result.item?.id).toBe(`radar-${analysis.id}`);
  });

  it("reports an approved Review with a missing Radar item as an integrity error", async () => {
    const repository = await repositoryWith({ ...pendingReview, status: "approved", reviewedAt: "2026-07-27T00:01:00.000Z" });

    await expectIntegrityError(
      reviewAnalysis(repository, analysis.id, "approved", ""),
      "Approval integrity error: approved review is missing its Radar item.",
    );
  });

  it("reports a pending Review with an existing Radar item as an integrity error", async () => {
    const repository = await repositoryWith();
    await repository.saveRadarItem(radarItem());

    await expectIntegrityError(
      reviewAnalysis(repository, analysis.id, "approved", ""),
      "Approval integrity error: an unpublished review already has a Radar item.",
    );
  });

  it("never publishes a rejected Review", async () => {
    const repository = await repositoryWith({ ...pendingReview, status: "rejected", reviewedAt: "2026-07-27T00:01:00.000Z" });

    await expectIntegrityError(
      reviewAnalysis(repository, analysis.id, "approved", ""),
      "Approval integrity error: a rejected review cannot be published.",
    );
    expect(await repository.findRadarItemByAnalysis(analysis.id)).toBeNull();
  });

  it("does not change unrelated records", async () => {
    const repository = await repositoryWith();
    const unrelatedAnalysis = { ...analysis, id: "analysis-2", processingRunId: "run-2" };
    const unrelatedReview = { ...pendingReview, id: "review-2", analysisResultId: unrelatedAnalysis.id };
    await repository.saveAnalysis(unrelatedAnalysis);
    await repository.saveReview(unrelatedReview);

    await reviewAnalysis(repository, analysis.id, "approved", "");

    expect(await repository.getAnalysis(unrelatedAnalysis.id)).toEqual(unrelatedAnalysis);
    expect(await repository.getReviewForAnalysis(unrelatedAnalysis.id)).toEqual(unrelatedReview);
    expect(await repository.findRadarItemByAnalysis(unrelatedAnalysis.id)).toBeNull();
    expect(await repository.getSource(sourceFixture.id)).toEqual(sourceFixture);
  });
});
