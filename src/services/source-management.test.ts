import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "@/persistence/memory";
import { validOperatorToken } from "@/auth/operator";
import { createSourceDefinition, getSourceStatistics, listManagedSources, normalizeFeedUrl, transitionSource, updateSourceDefinition } from "./source-management";
import { ingestSource, IngestionError } from "./ingestion";
import { runPipeline } from "./pipeline";
import { reviewAnalysis } from "./review";
import { analysisFixture, sourceDefinitionFixture, sourceFixture } from "@/test/fixtures";
import type { AiAnalyzer } from "./ai";
import { SourceDefinitionSchema } from "@/domain/schemas";

const input = {
  displayName: "Google Cloud AI",
  publisher: "Google Cloud",
  canonicalDomain: "cloud.google.com",
  allowedFeedDomains: ["cloudblog.withgoogle.com"],
  allowedArticleDomains: ["blog.google"],
  homepage: "https://cloud.google.com",
  rssUrl: null,
  documentationUrl: "https://cloud.google.com/docs",
  category: "ai_platform" as const,
  language: "en",
  country: "US",
  trustLevel: "official" as const,
  status: "disabled" as const,
  requiresHumanReview: true as const,
  notes: "Official product announcements.",
};
const html = `<html><head><title>Managed source announcement</title><meta property="article:published_time" content="2026-07-24T00:00:00Z"></head><body>${"Grounded product details from a managed official source. ".repeat(20)}</body></html>`;
const fetcher = vi.fn(async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } }));
const analyzer: AiAnalyzer = { analyze: vi.fn(async () => ({ result: analysisFixture, model: "deterministic-source-test" })) };

describe("source management", () => {
  afterEach(() => { vi.restoreAllMocks(); delete process.env.OPERATOR_ACCESS_TOKEN; });

  it("creates and edits source metadata without changing its identity", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = new MemoryRepository();
    const created = await createSourceDefinition(repository, input);
    const updated = await updateSourceDefinition(repository, created.id, { ...input, displayName: "Google Cloud and Vertex AI", notes: "Updated by an operator." });
    expect(await repository.countSourceDefinitions()).toBe(1);
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.displayName).toContain("Vertex AI");
    expect(updated.allowedFeedDomains).toEqual(input.allowedFeedDomains);
    expect(updated.allowedArticleDomains).toEqual(input.allowedArticleDomains);
  });

  it("enables, disables, blocks, and archives with deterministic safety", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = new MemoryRepository();
    const source = await createSourceDefinition(repository, input);
    expect((await transitionSource(repository, source.id, "enable")).status).toBe("enabled");
    expect((await transitionSource(repository, source.id, "disable")).status).toBe("disabled");
    const blocked = await transitionSource(repository, source.id, "block");
    expect(blocked).toMatchObject({ status: "blocked", trustLevel: "blocked" });
    const second = await createSourceDefinition(repository, { ...input, canonicalDomain: "blog.google", homepage: "https://blog.google" });
    expect((await transitionSource(repository, second.id, "archive")).status).toBe("archived");
    await expect(updateSourceDefinition(repository, second.id, { ...input, canonicalDomain: "blog.google", homepage: "https://blog.google" })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects unregistered, disabled, experimental, blocked, and archived sources before fetch", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = new MemoryRepository();
    await expect(ingestSource("https://cloud.google.com/blog/test", repository, fetcher as typeof fetch)).rejects.toMatchObject({ statusCode: 400 } satisfies Partial<IngestionError>);
    const disabled = await createSourceDefinition(repository, input);
    await expect(ingestSource("https://cloud.google.com/blog/test", repository, fetcher as typeof fetch)).rejects.toMatchObject({ statusCode: 403 } satisfies Partial<IngestionError>);
    await updateSourceDefinition(repository, disabled.id, { ...input, status: "disabled", trustLevel: "experimental" });
    await expect(transitionSource(repository, disabled.id, "enable")).rejects.toMatchObject({ statusCode: 403 });
    await transitionSource(repository, disabled.id, "block");
    await expect(ingestSource("https://cloud.google.com/blog/test", repository, fetcher as typeof fetch)).rejects.toMatchObject({ statusCode: 403 });
    expect(fetcher).not.toHaveBeenCalled();
    expect(analyzer.analyze).not.toHaveBeenCalled();
    expect(await repository.listSources()).toHaveLength(0);
  });

  it("lists with filtering and reports article review statistics", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = new MemoryRepository();
    const source = await createSourceDefinition(repository, { ...input, status: "enabled" });
    const listed = await listManagedSources(repository, { status: "enabled", trust: "official", publisher: "google" });
    expect(listed.sources.map((x) => x.id)).toEqual([source.id]);
    const pipeline = await runPipeline("https://cloud.google.com/blog/test", repository, analyzer, fetcher as typeof fetch);
    await reviewAnalysis(repository, pipeline.analysis.id, "approved", "Verified by human");
    await expect(getSourceStatistics(repository, source)).resolves.toMatchObject({ processedArticles: 1, approved: 1, rejected: 0 });
  });

  it("uses allowed article domains for legacy URL-based statistics matching", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = new MemoryRepository();
    const source = await createSourceDefinition(repository, input);
    await repository.saveSource({ ...sourceFixture, sourceDefinitionId: undefined, sourceUrl: "https://news.blog.google/announcement" });
    await expect(getSourceStatistics(repository, source)).resolves.toMatchObject({ processedArticles: 1 });
  });

  it("keeps operator authorization server-side and logs no secret fields", async () => {
    process.env.OPERATOR_ACCESS_TOKEN = "phase-five-test-operator-token";
    expect(validOperatorToken("phase-five-test-operator-token")).toBe(true);
    expect(validOperatorToken("wrong-token-value-that-is-long")).toBe(false);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = new MemoryRepository();
    await createSourceDefinition(repository, input);
    expect(String(info.mock.calls[0][0])).not.toMatch(/token|authorization|credential|header|prompt/i);
  });

  it("rejects duplicate normalized feed URLs across distinct domains", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const repository = new MemoryRepository();
    const rssUrl = "https://feeds.example.com/ai.xml#section";
    await createSourceDefinition(repository, { ...input, canonicalDomain: "example.com", homepage: "https://example.com", rssUrl });
    await expect(createSourceDefinition(repository, {
      ...input,
      displayName: "Second official publisher",
      publisher: "Second Publisher",
      canonicalDomain: "second.example",
      homepage: "https://second.example",
      rssUrl: "https://feeds.example.com/ai.xml",
    })).rejects.toMatchObject({ statusCode: 409 });
    expect(await repository.countSourceDefinitions()).toBe(1);
    expect(normalizeFeedUrl(rssUrl)).toBe("https://feeds.example.com/ai.xml");
  });

  it("emits safe registration verification metadata and preserves human review", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = new MemoryRepository();
    const source = await createSourceDefinition(repository, {
      ...input,
      status: "enabled",
      rssUrl: "https://cloud.google.com/blog/rss.xml",
    });
    const events = info.mock.calls.map((call) => JSON.parse(String(call[0])) as Record<string, unknown>);
    const verified = events.find((event) => event.event === "source.registration_verified");
    expect(source.requiresHumanReview).toBe(true);
    expect(verified).toMatchObject({
      sourceDefinitionId: source.id,
      publisher: source.publisher,
      canonicalDomain: source.canonicalDomain,
      trustLevel: "official",
      status: "enabled",
      action: "register",
      validationResult: "passed",
    });
    expect(verified?.feedUrlHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(events)).not.toMatch(/operator-token|authorization|credential|cookie|raw xml/i);
    expect(await repository.listRssCandidates(source.id)).toHaveLength(0);
    expect(await repository.listPublishedItems()).toHaveLength(0);
  });
  it("parses legacy sources with empty allowlists and validates new domain lists", () => {
    const legacy = { ...sourceDefinitionFixture() } as Record<string, unknown>;
    delete legacy.allowedFeedDomains;
    delete legacy.allowedArticleDomains;
    expect(SourceDefinitionSchema.parse(legacy)).toMatchObject({ allowedFeedDomains: [], allowedArticleDomains: [] });
    expect(SourceDefinitionSchema.parse({ ...legacy, allowedFeedDomains: ["Feeds.Example.com"], allowedArticleDomains: ["articles.example.com"] })).toMatchObject({ allowedFeedDomains: ["feeds.example.com"] });
    expect(() => SourceDefinitionSchema.parse({ ...legacy, allowedFeedDomains: ["not a domain"] })).toThrow();
    expect(() => SourceDefinitionSchema.parse({ ...legacy, allowedFeedDomains: ["feeds.example.com", "FEEDS.EXAMPLE.COM"] })).toThrow();
    expect(() => SourceDefinitionSchema.parse({ ...legacy, allowedFeedDomains: Array.from({ length: 21 }, (_, index) => `feed${index}.example.com`) })).toThrow();
  });
});
