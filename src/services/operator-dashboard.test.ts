import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "@/persistence/memory";
import { calculateDecisionMetrics, getReviewDetail, getReviewQueue } from "./operator-dashboard";
import { reviewAnalysis, ReviewActionError } from "./review";
import { runPipeline } from "./pipeline";
import { ReviewQueue } from "@/components/operator/review-queue";
import type { AiAnalyzer } from "./ai";
import { analysisFixture, sourceDefinitionFixture } from "@/test/fixtures";

const html = `<html><head><title>Operator test announcement</title><meta property="article:published_time" content="2026-07-24T00:00:00Z"></head><body>${"Grounded authoritative product details for operator review. ".repeat(20)}</body></html>`;
const fetcher = async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } });
const analyzer: AiAnalyzer = { async analyze() { return { result: analysisFixture, model: "deterministic-test-model" }; } };

async function pendingFixture() {
  const repository = new MemoryRepository();
  await repository.saveSourceDefinition(sourceDefinitionFixture());
  const pipeline = await runPipeline("https://cloud.google.com/blog/operator-test", repository, analyzer, fetcher as typeof fetch);
  return { repository, pipeline };
}

describe("operator dashboard and human review invariants", () => {
  it("lists pending reviews with correct provenance and semantic AI/human distinction", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { repository, pipeline } = await pendingFixture();
    const queue = await getReviewQueue(repository);
    const detail = await getReviewDetail(repository, pipeline.analysis.id);
    expect(queue).toHaveLength(1);
    expect(queue[0].review.status).toBe("pending");
    expect(detail?.source.id).toBe(pipeline.source.id);
    expect(detail?.run.id).toBe(pipeline.run.id);
    const markup = renderToStaticMarkup(ReviewQueue({ entries: queue }));
    expect(markup).toContain("pending");
    expect(markup).not.toMatch(/operator-token|authorization|raw prompt|credentials/i);
  });

  it("filters structured reviews by company, technology, recommendation, and decision scores", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { repository } = await pendingFixture();
    expect(await getReviewQueue(repository, { company: "google" })).toHaveLength(1);
    expect(await getReviewQueue(repository, { technology: "api" })).toHaveLength(1);
    expect(await getReviewQueue(repository, { recommendation: "Needs Human Attention" })).toHaveLength(1);
    expect(await getReviewQueue(repository, { minImportance: 80, minNovelty: 70, status: "pending" })).toHaveLength(1);
    expect(await getReviewQueue(repository, { minImportance: 81 })).toHaveLength(0);
  });

  it("calculates bounded decision metrics from structured analyses", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { repository } = await pendingFixture();
    const metrics = calculateDecisionMetrics(await getReviewQueue(repository));
    expect(metrics).toMatchObject({ averageImportance: 80, averageConfidence: 90, duplicateRate: 0 });
    expect(metrics.mostCommonCompanies[0]).toEqual({ label: "Google", count: 1 });
    expect(metrics.mostCommonTechnologies[0]).toEqual({ label: "API", count: 1 });
    expect(metrics.recommendationDistribution[0]).toEqual({ label: "Needs Human Attention", count: 1 });
  });

  it("keeps pending and rejected analyses out of the feed", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { repository, pipeline } = await pendingFixture();
    expect(await repository.listPublishedItems()).toHaveLength(0);
    await reviewAnalysis(repository, pipeline.analysis.id, "rejected", "Evidence is insufficient");
    expect(await repository.listPublishedItems()).toHaveLength(0);
  });

  it("publishes an approved analysis exactly once under duplicate submission", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { repository, pipeline } = await pendingFixture();
    const first = await reviewAnalysis(repository, pipeline.analysis.id, "approved", "Evidence verified");
    const duplicate = await reviewAnalysis(repository, pipeline.analysis.id, "approved", "Duplicate click");
    expect(first.item?.id).toBe(`radar-${pipeline.analysis.id}`);
    expect(duplicate.idempotent).toBe(true);
    expect(await repository.listPublishedItems()).toHaveLength(1);
  });

  it("rejects terminal-state changes with a conflict", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { repository, pipeline } = await pendingFixture();
    await reviewAnalysis(repository, pipeline.analysis.id, "rejected", "Not relevant");
    await expect(reviewAnalysis(repository, pipeline.analysis.id, "approved", "Changed mind")).rejects.toEqual(expect.objectContaining<Partial<ReviewActionError>>({ statusCode: 409 }));
  });

  it("requires a rejection reason", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { repository, pipeline } = await pendingFixture();
    await expect(reviewAnalysis(repository, pipeline.analysis.id, "rejected", "")).rejects.toEqual(expect.objectContaining<Partial<ReviewActionError>>({ statusCode: 400 }));
  });
});
