import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "@/persistence/memory";
import type { AiAnalyzer } from "./ai";
import { rerunPipeline, runPipeline } from "./pipeline";
import { reviewAnalysis } from "./review";
import { analysisFixture, sourceDefinitionFixture } from "@/test/fixtures";

const html = `<html><head><title>Official announcement</title><meta property="article:published_time" content="2026-07-24T00:00:00Z"></head><body>${"Authoritative details about a product announcement. ".repeat(20)}</body></html>`;
const fetcher = async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } });
const mock: AiAnalyzer = { async analyze() { return { result: analysisFixture, model: "deterministic-test-model", tokenUsage: { totalTokens: 100 } }; } };
async function repositoryFor(domain = "cloud.google.com") { const repository = new MemoryRepository(); await repository.saveSourceDefinition(sourceDefinitionFixture(domain, `definition-${domain}`)); return repository; }

describe("pipeline and approval gate", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits a safe structured completion event for initial processing", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repo = await repositoryFor();
    const result = await runPipeline("https://cloud.google.com/blog/initial-log", repo, mock, fetcher as typeof fetch, { candidateId: "rss-candidate-1" });
    const events = info.mock.calls.map(([value]) => JSON.parse(String(value)));
    const event = events.at(-1);

    expect(event).toMatchObject({
      event: "pipeline.completed",
      executionKind: "production",
      sourceId: result.source.id,
      runId: result.run.id,
      analysisId: result.analysis.id,
      processingMode: "initial",
      model: "deterministic-test-model",
      schemaValidationStatus: "passed",
      persistenceStatus: "persisted",
      reviewStatus: "pending",
    });
    expect(events.map(({ event: name }) => name)).toEqual([
      "pipeline.started",
      "analysis.created",
      "review.pending_created",
      "pipeline.completed",
    ]);
    expect(events[0]).toMatchObject({
      processingRunId: result.run.id,
      candidateId: "rss-candidate-1",
      sourceId: result.source.id,
    });
    expect(events[1]).toMatchObject({
      analysisId: result.analysis.id,
      processingRunId: result.run.id,
      candidateId: "rss-candidate-1",
      model: "deterministic-test-model",
    });
    expect(events[2]).toMatchObject({
      analysisId: result.analysis.id,
      status: "pending",
    });
    expect(JSON.stringify(events)).not.toMatch(/token|authorization|credential|prompt|normalizedText|articleBody|rawResponse|cookie|secret/i);
  });

  it("emits the same structured completion event for successful reruns", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repo = await repositoryFor();
    const initial = await runPipeline("https://cloud.google.com/blog/rerun-log", repo, mock, fetcher as typeof fetch);
    info.mockClear();

    const rerun = await rerunPipeline(initial.source.id, repo, mock);
    const events = info.mock.calls.map(([value]) => JSON.parse(String(value)));
    const event = events.at(-1);

    expect(event).toMatchObject({
      event: "pipeline.completed",
      executionKind: "production",
      sourceId: initial.source.id,
      runId: rerun.run.id,
      analysisId: rerun.analysis.id,
      processingMode: "rerun",
      schemaValidationStatus: "passed",
      persistenceStatus: "persisted",
      reviewStatus: "pending",
    });
    expect(events.map(({ event: name }) => name)).toEqual([
      "pipeline.started",
      "analysis.created",
      "review.pending_created",
      "pipeline.completed",
    ]);
  });

  it("processes with deterministic test adapter but publishes only after approval", async () => {
    const repo = await repositoryFor();
    const result = await runPipeline("https://cloud.google.com/blog/test", repo, mock, fetcher as typeof fetch);
    expect(result.run.status).toBe("pending_review");
    expect(await repo.listPublishedItems()).toHaveLength(0);
    await reviewAnalysis(repo, result.analysis.id, "rejected", "Not suitable");
    expect(await repo.listPublishedItems()).toHaveLength(0);
  });
  it("provides bounded previous coverage to Gemini before duplicate recommendation", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repo = await repositoryFor();
    const first = await runPipeline("https://cloud.google.com/blog/previous", repo, mock, fetcher as typeof fetch);
    const analyze = vi.fn<AiAnalyzer["analyze"]>(async () => ({ result: analysisFixture, model: "context-test-model" }));
    const currentHtml = html.replace("Official announcement", "Current announcement").replace("product announcement", "current platform update");
    const currentFetcher = async () => new Response(currentHtml, { status: 200, headers: { "content-type": "text/html" } });
    await runPipeline("https://cloud.google.com/blog/current", repo, { analyze }, currentFetcher as typeof fetch);
    const context = analyze.mock.calls[0][1];
    expect(context?.previousArticles).toHaveLength(1);
    expect(context?.previousArticles[0]).toMatchObject({
      sourceRecordId: first.source.id,
      title: first.source.title,
      summary: first.analysis.summary,
    });
    expect(context?.previousArticles[0]).not.toHaveProperty("normalizedText");
  });
  it("publishes approved analysis with full provenance", async () => {
    const repo = await repositoryFor("blog.google");
    const result = await runPipeline("https://blog.google/test", repo, mock, fetcher as typeof fetch);
    const reviewed = await reviewAnalysis(repo, result.analysis.id, "approved", "Evidence checked");
    expect((await repo.listPublishedItems())).toHaveLength(1);
    expect(reviewed.item?.originalSourceUrl).toBe("https://blog.google/test");
    expect(reviewed.item?.processingRunId).toBe(result.run.id);
  });
});
