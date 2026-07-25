import { NextRequest, NextResponse } from "next/server";
import { validOperatorToken } from "@/auth/operator";
import { SourceDefinitionSchema } from "@/domain/schemas";
import { MemoryRepository } from "@/persistence/memory";
import { discoverRss } from "@/services/rss-discovery";

export async function POST(request: NextRequest) {
  if (!validOperatorToken(request.headers.get("x-operator-token") || "")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const repository = new MemoryRepository();
  const now = new Date().toISOString();
  await repository.saveSourceDefinition(SourceDefinitionSchema.parse({
    id: "rss-diagnostic-source", displayName: "RSS diagnostic fixture", publisher: "LAFRYHI AI Radar",
    canonicalDomain: "diagnostic.example", allowedFeedDomains: [], allowedArticleDomains: [], homepage: "https://diagnostic.example", rssUrl: "https://diagnostic.example/feed.xml",
    documentationUrl: null, category: "ai_platform", language: "en", country: "US", trustLevel: "official",
    status: "enabled", requiresHumanReview: true, notes: "Non-persistent deterministic runtime diagnostic.", createdAt: now, updatedAt: now,
  }));
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Diagnostic</title><item><title>Deterministic RSS validation item</title><link>https://diagnostic.example/article</link><guid>rss-diagnostic-item</guid><pubDate>Fri, 24 Jul 2026 10:00:00 GMT</pubDate><description>Non-sensitive deterministic feed metadata.</description></item></channel></rss>`;
  const dependencies = {
    resolver: async () => ["8.8.8.8"],
    fetcher: async () => new Response(xml, { status: 200, headers: { "content-type": "application/rss+xml" } }),
  };
  const first = await discoverRss(repository, "manual", "rss-diagnostic-source", dependencies);
  const second = await discoverRss(repository, "manual", "rss-diagnostic-source", dependencies);
  const candidates = await repository.listRssCandidates("rss-diagnostic-source");
  const published = await repository.listPublishedItems();
  return NextResponse.json({
    status: "ok",
    persistence: "memory_only_nonpersistent",
    first: { status: first.status, accepted: first.candidatesAccepted, duplicates: first.duplicates },
    second: { status: second.status, accepted: second.candidatesAccepted, duplicates: second.duplicates },
    candidateCount: candidates.length,
    publicationCount: published.length,
    domains: { canonicalDomain: "diagnostic.example", allowedFeedDomains: [], allowedArticleDomains: [] },
  });
}
