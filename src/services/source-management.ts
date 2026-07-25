import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { SourceDefinitionSchema, type SourceDefinition, type SourceStatus } from "@/domain/schemas";
import { matchesAllowedDomain } from "@/domain/domain-policy";
import type { RadarRepository } from "@/persistence/repository";
import { logSourceEvent } from "./source-events";

export const TRUSTED_SOURCE_LEVELS = ["official", "verified", "community"] as const;
export const SOURCE_PAGE_SIZE = 20;
export const SOURCE_QUERY_LIMIT = 200;

export const SourceInputSchema = z.object({
  displayName: SourceDefinitionSchema.shape.displayName,
  publisher: SourceDefinitionSchema.shape.publisher,
  canonicalDomain: SourceDefinitionSchema.shape.canonicalDomain,
  allowedFeedDomains: SourceDefinitionSchema.shape.allowedFeedDomains,
  allowedArticleDomains: SourceDefinitionSchema.shape.allowedArticleDomains,
  homepage: SourceDefinitionSchema.shape.homepage,
  rssUrl: SourceDefinitionSchema.shape.rssUrl,
  documentationUrl: SourceDefinitionSchema.shape.documentationUrl,
  category: SourceDefinitionSchema.shape.category,
  language: SourceDefinitionSchema.shape.language,
  country: SourceDefinitionSchema.shape.country,
  trustLevel: SourceDefinitionSchema.shape.trustLevel,
  status: SourceDefinitionSchema.shape.status,
  notes: SourceDefinitionSchema.shape.notes,
  requiresHumanReview: z.literal(true).default(true),
}).superRefine((value, context) => {
  if ((value.status === "blocked") !== (value.trustLevel === "blocked")) context.addIssue({ code: "custom", message: "Blocked status and trust level must be set together." });
});

export type SourceInput = z.input<typeof SourceInputSchema>;

export class SourceManagementError extends Error {
  constructor(message: string, readonly statusCode: 400 | 403 | 404 | 409) { super(message); }
}

export function normalizeFeedUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.port === "443") url.port = "";
  return url.toString();
}

function feedUrlHash(value: string | null) {
  return value ? createHash("sha256").update(normalizeFeedUrl(value)).digest("hex") : undefined;
}

export async function createSourceDefinition(repository: RadarRepository, input: SourceInput) {
  const parsed = SourceInputSchema.safeParse(input);
  if (!parsed.success) {
    logSourceEvent({ event: "source.validation_failed", reason: "invalid_metadata" }, "warn");
    logSourceEvent({ event: "source.registration_rejected", action: "register", validationResult: "rejected", reason: "invalid_metadata" }, "warn");
    throw new SourceManagementError("Source metadata is invalid.", 400);
  }
  if (await repository.findSourceDefinitionByDomain(parsed.data.canonicalDomain)) {
    logSourceEvent({ event: "source.validation_failed", canonicalDomain: parsed.data.canonicalDomain, reason: "duplicate_domain" }, "warn");
    logSourceEvent({ event: "source.registration_rejected", publisher: parsed.data.publisher, canonicalDomain: parsed.data.canonicalDomain, feedUrlHash: feedUrlHash(parsed.data.rssUrl), trustLevel: parsed.data.trustLevel, status: parsed.data.status, action: "register", validationResult: "rejected", reason: "duplicate_domain" }, "warn");
    throw new SourceManagementError("A source with this domain already exists.", 409);
  }
  const normalizedFeed = parsed.data.rssUrl ? normalizeFeedUrl(parsed.data.rssUrl) : null;
  const duplicateFeed = normalizedFeed
    ? (await repository.listSourceDefinitions(SOURCE_QUERY_LIMIT)).find((source) => source.rssUrl && normalizeFeedUrl(source.rssUrl) === normalizedFeed)
    : null;
  if (duplicateFeed) {
    logSourceEvent({ event: "source.validation_failed", canonicalDomain: parsed.data.canonicalDomain, reason: "duplicate_feed_url" }, "warn");
    logSourceEvent({ event: "source.registration_rejected", publisher: parsed.data.publisher, canonicalDomain: parsed.data.canonicalDomain, feedUrlHash: feedUrlHash(parsed.data.rssUrl), trustLevel: parsed.data.trustLevel, status: parsed.data.status, action: "register", validationResult: "rejected", reason: "duplicate_feed_url" }, "warn");
    throw new SourceManagementError("A source with this feed URL already exists.", 409);
  }
  const now = new Date().toISOString();
  const source = SourceDefinitionSchema.parse({ ...parsed.data, rssUrl: normalizedFeed, id: randomUUID(), createdAt: now, updatedAt: now });
  await repository.saveSourceDefinition(source);
  logSourceEvent({ event: "source.created", sourceDefinitionId: source.id, canonicalDomain: source.canonicalDomain, resultingStatus: source.status });
  if (source.status === "enabled") logSourceEvent({ event: "source.enabled", sourceDefinitionId: source.id, canonicalDomain: source.canonicalDomain, resultingStatus: source.status });
  logSourceEvent({ event: "source.registration_verified", sourceDefinitionId: source.id, publisher: source.publisher, canonicalDomain: source.canonicalDomain, feedUrlHash: feedUrlHash(source.rssUrl), trustLevel: source.trustLevel, status: source.status, action: "register", validationResult: "passed" });
  return source;
}

export async function updateSourceDefinition(repository: RadarRepository, id: string, input: SourceInput) {
  const current = await repository.getSourceDefinition(id);
  if (!current) throw new SourceManagementError("Source not found.", 404);
  if (current.status === "archived") throw new SourceManagementError("Archived sources are read-only.", 409);
  const parsed = SourceInputSchema.safeParse(input);
  if (!parsed.success) throw new SourceManagementError("Source metadata is invalid.", 400);
  const duplicate = await repository.findSourceDefinitionByDomain(parsed.data.canonicalDomain);
  if (duplicate && duplicate.id !== id) throw new SourceManagementError("A source with this domain already exists.", 409);
  const normalizedFeed = parsed.data.rssUrl ? normalizeFeedUrl(parsed.data.rssUrl) : null;
  const duplicateFeed = normalizedFeed
    ? (await repository.listSourceDefinitions(SOURCE_QUERY_LIMIT)).find((source) => source.id !== id && source.rssUrl && normalizeFeedUrl(source.rssUrl) === normalizedFeed)
    : null;
  if (duplicateFeed) throw new SourceManagementError("A source with this feed URL already exists.", 409);
  const updated = SourceDefinitionSchema.parse({ ...current, ...parsed.data, rssUrl: normalizedFeed, id, createdAt: current.createdAt, updatedAt: new Date().toISOString() });
  await repository.saveSourceDefinition(updated);
  logSourceEvent({ event: "source.updated", sourceDefinitionId: id, canonicalDomain: updated.canonicalDomain, previousStatus: current.status, resultingStatus: updated.status });
  return updated;
}

export async function transitionSource(repository: RadarRepository, id: string, action: "enable" | "disable" | "block" | "archive") {
  const current = await repository.getSourceDefinition(id);
  if (!current) throw new SourceManagementError("Source not found.", 404);
  if (current.status === "archived") throw new SourceManagementError("Archived sources are read-only.", 409);
  let status: SourceStatus;
  let trustLevel = current.trustLevel;
  if (action === "enable") {
    if (!TRUSTED_SOURCE_LEVELS.includes(current.trustLevel as typeof TRUSTED_SOURCE_LEVELS[number])) {
      logSourceEvent({ event: "source.validation_failed", sourceDefinitionId: id, canonicalDomain: current.canonicalDomain, reason: "not_trusted" }, "warn");
      throw new SourceManagementError("Only trusted sources can be enabled.", 403);
    }
    status = "enabled";
  } else if (action === "disable") {
    status = "disabled";
  } else if (action === "block") {
    status = "blocked";
    trustLevel = "blocked";
  } else {
    status = "archived";
  }
  const updated = SourceDefinitionSchema.parse({ ...current, status, trustLevel, updatedAt: new Date().toISOString() });
  await repository.saveSourceDefinition(updated);
  logSourceEvent({ event: `source.${action === "enable" ? "enabled" : action === "disable" ? "disabled" : action === "block" ? "blocked" : "archived"}`, sourceDefinitionId: id, canonicalDomain: updated.canonicalDomain, previousStatus: current.status, resultingStatus: updated.status });
  return updated;
}

export type SourceListFilters = { status?: string; trust?: string; category?: string; publisher?: string; sort?: "updated" | "name" | "publisher"; page?: number };

export async function listManagedSources(repository: RadarRepository, filters: SourceListFilters = {}) {
  let sources = await repository.listSourceDefinitions(SOURCE_QUERY_LIMIT);
  if (filters.status && filters.status !== "all") sources = sources.filter((x) => x.status === filters.status);
  if (filters.trust && filters.trust !== "all") sources = sources.filter((x) => x.trustLevel === filters.trust);
  if (filters.category && filters.category !== "all") sources = sources.filter((x) => x.category === filters.category);
  if (filters.publisher) sources = sources.filter((x) => x.publisher.toLowerCase().includes(filters.publisher!.toLowerCase()));
  sources.sort((a, b) => filters.sort === "name" ? a.displayName.localeCompare(b.displayName) : filters.sort === "publisher" ? a.publisher.localeCompare(b.publisher) : b.updatedAt.localeCompare(a.updatedAt));
  const page = Math.max(1, Number.isInteger(filters.page) ? filters.page! : 1);
  const start = (page - 1) * SOURCE_PAGE_SIZE;
  return { sources: sources.slice(start, start + SOURCE_PAGE_SIZE), totalFiltered: sources.length, page, pageSize: SOURCE_PAGE_SIZE, hasNext: start + SOURCE_PAGE_SIZE < sources.length };
}

export async function getSourceStatistics(repository: RadarRepository, source: SourceDefinition) {
  const [articles, runs, analyses, reviews] = await Promise.all([
    repository.listSources(SOURCE_QUERY_LIMIT),
    repository.listRuns(SOURCE_QUERY_LIMIT),
    repository.listAnalyses(SOURCE_QUERY_LIMIT),
    repository.listReviews(SOURCE_QUERY_LIMIT),
  ]);
  const matched = articles.filter((x) => x.sourceDefinitionId === source.id || matchesAllowedDomain(new URL(x.sourceUrl).hostname, source.canonicalDomain, source.allowedArticleDomains));
  const articleIds = new Set(matched.map((x) => x.id));
  const matchedRuns = runs.filter((x) => articleIds.has(x.sourceRecordId));
  const analysisIds = new Set(analyses.filter((x) => articleIds.has(x.sourceRecordId)).map((x) => x.id));
  const matchedReviews = reviews.filter((x) => analysisIds.has(x.analysisResultId));
  return {
    processedArticles: matched.length,
    approved: matchedReviews.filter((x) => x.status === "approved").length,
    rejected: matchedReviews.filter((x) => x.status === "rejected").length,
    lastProcessingAt: matchedRuns[0]?.completedAt ?? matchedRuns[0]?.startedAt ?? null,
  };
}
