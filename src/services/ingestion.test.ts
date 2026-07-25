import { describe, expect, it } from "vitest";
import { MemoryRepository } from "@/persistence/memory";
import { DuplicateSourceError, ingestSource, validateSourceUrl } from "./ingestion";
import { sourceDefinitionFixture } from "@/test/fixtures";

const html = `<html><head><title>Official announcement</title><meta property="article:published_time" content="2026-07-24T00:00:00Z"></head><body>${"Authoritative details about a real product announcement. ".repeat(20)}</body></html>`;
const fetcher = async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } });

describe("ingestion", () => {
  it("rejects structurally unsafe URLs", () => {
    expect(() => validateSourceUrl("http://cloud.google.com/x")).toThrow();
    expect(() => validateSourceUrl("https://127.0.0.1/x")).toThrow();
    expect(() => validateSourceUrl("not a url")).toThrow();
  });
  it("detects duplicate content", async () => {
    const repo = new MemoryRepository();
    await repo.saveSourceDefinition(sourceDefinitionFixture());
    const first = await ingestSource("https://cloud.google.com/blog/a", repo, fetcher as typeof fetch);
    await repo.saveSource(first);
    await expect(ingestSource("https://cloud.google.com/blog/b", repo, fetcher as typeof fetch)).rejects.toBeInstanceOf(DuplicateSourceError);
  });
});
