import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { MemoryRepository } from "@/persistence/memory";
import { sourceDefinitionFixture, analysisFixture } from "@/test/fixtures";
import { discoverRss, parseFeed, RSS_LIMITS, validateNetworkTarget } from "./rss-discovery";
import { processRssCandidate } from "./rss-candidate-processing";
import { handleOperatorRssDiscovery } from "@/app/api/internal/operator/rss/discover/route";
import { handleScheduledRssDiscovery } from "@/app/api/internal/rss/scheduled/route";
import { POST as diagnosticPost } from "@/app/api/internal/rss/diagnostics/route";
import type { AiAnalyzer } from "./ai";

const resolver = async () => ["8.8.8.8"];
const rss = (items: string) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Official</title>${items}</channel></rss>`;
const item = (url: string, guid = url, title = "Official announcement") => `<item><title>${title}</title><link>${url}</link><guid>${guid}</guid><pubDate>Fri, 24 Jul 2026 10:00:00 GMT</pubDate><description>Safe short summary.</description></item>`;
const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Official</title><entry><title>Atom announcement</title><link rel="alternate" href="https://cloud.google.com/blog/atom"/><id>atom-1</id><updated>2026-07-24T10:00:00Z</updated><summary>Atom summary.</summary></entry></feed>`;
const response = (body: string, headers: Record<string, string> = { "content-type": "application/rss+xml" }, status = 200) => new Response(body, { status, headers });

async function repositoryWith(overrides: Partial<ReturnType<typeof sourceDefinitionFixture>> = {}) {
  const repository = new MemoryRepository();
  await repository.saveSourceDefinition({ ...sourceDefinitionFixture(), rssUrl: "https://cloud.google.com/feed.xml", ...overrides });
  return repository;
}

describe("controlled RSS discovery", () => {
  beforeEach(() => { vi.spyOn(console, "info").mockImplementation(() => undefined); vi.spyOn(console, "warn").mockImplementation(() => undefined); });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.OPERATOR_ACCESS_TOKEN; delete process.env.RSS_SCHEDULER_JOB_NAME; });

  it("discovers an eligible RSS source without publishing", async () => {
    const repository = await repositoryWith();
    const run = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response(rss(item("https://cloud.google.com/blog/rss")))) as typeof fetch });
    expect(run).toMatchObject({ status: "success", itemsExamined: 1, candidatesAccepted: 1 });
    expect(await repository.listRssCandidates("source-definition-1")).toHaveLength(1);
    expect(await repository.listPublishedItems()).toHaveLength(0);
  });

  it("parses Atom feeds", async () => {
    const repository = await repositoryWith();
    const run = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response(atom, { "content-type": "application/atom+xml" })) as typeof fetch });
    expect(run.candidatesAccepted).toBe(1);
    expect((await repository.listRssCandidates("source-definition-1"))[0].title).toBe("Atom announcement");
  });

  it.each([
    ["disabled", "official"],
    ["blocked", "blocked"],
    ["archived", "official"],
    ["enabled", "experimental"],
  ] as const)("rejects %s/%s sources before retrieval", async (status, trustLevel) => {
    const repository = await repositoryWith({ status, trustLevel });
    const fetcher = vi.fn();
    const run = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: fetcher as typeof fetch });
    expect(run).toMatchObject({ status: "skipped", candidatesAccepted: 0, validationFailures: 1 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("skips an eligible source with no RSS URL", async () => {
    const repository = await repositoryWith({ rssUrl: null });
    const run = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn() as unknown as typeof fetch });
    expect(run).toMatchObject({ status: "skipped", candidatesAccepted: 0 });
    expect(run.errorCategories).toContain("missing_feed");
  });

  it("rejects malformed and oversized feeds", async () => {
    const malformedRepository = await repositoryWith();
    const malformed = await discoverRss(malformedRepository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response("<html>not feed</html>", { "content-type": "application/xml" })) as typeof fetch });
    expect(malformed).toMatchObject({ status: "failed", feedsFailed: 1 });
    expect(malformed.errorCategories).toContain("malformed_feed");
    const oversizedRepository = await repositoryWith();
    const oversized = await discoverRss(oversizedRepository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response("x", { "content-type": "application/rss+xml", "content-length": String(RSS_LIMITS.maxFeedBytes + 1) })) as typeof fetch });
    expect(oversized.errorCategories).toContain("oversized_feed");
  });

  it("rejects redirects outside the registered domain", async () => {
    const repository = await repositoryWith();
    const fetcher = vi.fn(async () => response("", { location: "https://evil.example/feed.xml" }, 302));
    const run = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: fetcher as typeof fetch });
    expect(run).toMatchObject({ status: "failed", candidatesAccepted: 0 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects unsafe hosts, literal IPs, and private DNS answers", async () => {
    await expect(validateNetworkTarget(new URL("https://127.0.0.1/feed"), "cloud.google.com", resolver)).rejects.toMatchObject({ category: "unsafe_url" });
    await expect(validateNetworkTarget(new URL("https://cloud.google.com/feed"), "cloud.google.com", async () => ["10.0.0.1"])).rejects.toMatchObject({ category: "unsafe_url" });
    await expect(validateNetworkTarget(new URL("https://localhost/feed"), "localhost", resolver)).rejects.toMatchObject({ category: "unsafe_url" });
  });

  it("isolates out-of-domain and malformed items while accepting a valid item", async () => {
    const repository = await repositoryWith();
    const feed = rss(item("https://evil.example/article", "evil") + "<item><title>Missing link</title></item>" + item("https://cloud.google.com/blog/good", "good"));
    const run = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response(feed)) as typeof fetch });
    expect(run).toMatchObject({ candidatesAccepted: 1, validationFailures: 2, skippedItems: 2 });
  });

  it("deduplicates existing article URLs, candidate URLs, and stable feed identifiers", async () => {
    const repository = await repositoryWith();
    const feed = rss(item("https://cloud.google.com/blog/one", "same-guid") + item("https://cloud.google.com/blog/two", "same-guid"));
    const first = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response(feed)) as typeof fetch });
    const second = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response(feed)) as typeof fetch });
    expect(first).toMatchObject({ candidatesAccepted: 1, duplicates: 1 });
    expect(second).toMatchObject({ candidatesAccepted: 0, duplicates: 2 });
    expect(await repository.listRssCandidates("source-definition-1")).toHaveLength(1);
  });

  it("enforces bounded item and candidate limits", async () => {
    const repository = await repositoryWith();
    const items = Array.from({ length: 70 }, (_, index) => item(`https://cloud.google.com/blog/${index}`, `guid-${index}`)).join("");
    const run = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response(rss(items))) as typeof fetch });
    expect(run.itemsExamined).toBe(RSS_LIMITS.maxItemsPerFeed);
    expect(run.candidatesAccepted).toBe(RSS_LIMITS.maxAcceptedPerSource);
  });

  it("continues after a per-item persistence failure", async () => {
    class FailingOnceRepository extends MemoryRepository {
      private fail = true;
      override async saveRssCandidate(value: Parameters<MemoryRepository["saveRssCandidate"]>[0]) {
        if (this.fail) { this.fail = false; throw new Error("deterministic persistence failure"); }
        return super.saveRssCandidate(value);
      }
    }
    const repository = new FailingOnceRepository();
    await repository.saveSourceDefinition({ ...sourceDefinitionFixture(), rssUrl: "https://cloud.google.com/feed.xml" });
    const run = await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response(rss(item("https://cloud.google.com/blog/a") + item("https://cloud.google.com/blog/b")))) as typeof fetch });
    expect(run).toMatchObject({ candidatesAccepted: 1, validationFailures: 1 });
  });

  it("requires operator authorization for manual discovery", async () => {
    process.env.OPERATOR_ACCESS_TOKEN = "phase-six-operator-access-token";
    const repository = await repositoryWith();
    const unauthorized = await handleOperatorRssDiscovery(new NextRequest("https://example.test/api/internal/operator/rss/discover", { method: "POST", body: "{}" }), repository);
    expect(unauthorized.status).toBe(401);
    const authorized = await handleOperatorRssDiscovery(new NextRequest("https://example.test/api/internal/operator/rss/discover", { method: "POST", headers: { "content-type": "application/json", "x-operator-token": "phase-six-operator-access-token" }, body: JSON.stringify({ sourceDefinitionId: "missing" }) }), repository);
    expect(authorized.status).toBe(200);
  });

  it("requires Cloud Scheduler headers in addition to private Cloud Run IAM", async () => {
    const repository = new MemoryRepository();
    process.env.RSS_SCHEDULER_JOB_NAME = "lafryhi-ai-radar-rss-discovery";
    const unauthorized = await handleScheduledRssDiscovery(new NextRequest("https://example.test/api/internal/rss/scheduled", { method: "POST" }), repository);
    expect(unauthorized.status).toBe(401);
    const authorized = await handleScheduledRssDiscovery(new NextRequest("https://example.test/api/internal/rss/scheduled", { method: "POST", headers: { "x-cloudscheduler": "true", "x-cloudscheduler-jobname": "projects/test/locations/us-central1/jobs/lafryhi-ai-radar-rss-discovery" } }), repository);
    expect(authorized.status).toBe(200);
  });

  it("protects the non-persistent runtime diagnostic", async () => {
    process.env.OPERATOR_ACCESS_TOKEN = "phase-six-operator-access-token";
    const unauthorized = await diagnosticPost(new NextRequest("https://example.test/api/internal/rss/diagnostics", { method: "POST" }));
    expect(unauthorized.status).toBe(401);
    const authorized = await diagnosticPost(new NextRequest("https://example.test/api/internal/rss/diagnostics", { method: "POST", headers: { "x-operator-token": "phase-six-operator-access-token" } }));
    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toMatchObject({ persistence: "memory_only_nonpersistent", first: { accepted: 1 }, second: { duplicates: 1 }, candidateCount: 1, publicationCount: 0 });
  });

  it("processes a candidate through the existing pending-review pipeline only", async () => {
    const repository = await repositoryWith();
    await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response(rss(item("https://cloud.google.com/blog/process")))) as typeof fetch });
    const candidate = (await repository.listRssCandidates("source-definition-1"))[0];
    const articleHtml = `<html><head><title>Processed RSS article</title><meta property="article:published_time" content="2026-07-24T10:00:00Z"></head><body>${"Authoritative article content. ".repeat(30)}</body></html>`;
    const analyzer: AiAnalyzer = { async analyze() { return { result: analysisFixture, model: "deterministic-rss-test" }; } };
    await processRssCandidate(repository, analyzer, candidate.id, vi.fn(async () => new Response(articleHtml, { headers: { "content-type": "text/html" } })) as typeof fetch);
    expect((await repository.listRssCandidates("source-definition-1"))[0].status).toBe("processed");
    expect((await repository.listReviews())[0].status).toBe("pending");
    expect(await repository.listPublishedItems()).toHaveLength(0);
  });

  it("emits safe structured logs without bodies or credentials", async () => {
    const repository = await repositoryWith();
    const info = vi.spyOn(console, "info");
    await discoverRss(repository, "manual", "source-definition-1", { resolver, fetcher: vi.fn(async () => response(rss(item("https://cloud.google.com/blog/log")))) as typeof fetch });
    const serialized = JSON.stringify(info.mock.calls);
    expect(serialized).toContain("rss.discovery_completed");
    expect(serialized).not.toMatch(/authorization|credential|token|rawXml|feedBody|articleBody|prompt|modelResponse/i);
  });

  it("rejects DTD and entity declarations", () => {
    expect(() => parseFeed(`<!DOCTYPE rss [<!ENTITY x "boom">]><rss><channel>${item("https://cloud.google.com/blog/x")}</channel></rss>`)).toThrow();
  });
});
