import { createHash, randomUUID } from "node:crypto";
import { SourceRecordSchema, type SourceDefinition, type SourceRecord } from "@/domain/schemas";
import type { RadarRepository } from "@/persistence/repository";
import { logSourceEvent } from "./source-events";
import { TRUSTED_SOURCE_LEVELS } from "./source-management";

const MAX_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 10_000;

export class IngestionError extends Error {
  constructor(message: string, readonly statusCode: 400 | 403 = 400) { super(message); }
}
export class DuplicateSourceError extends IngestionError {}

export function validateSourceUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch {
    logSourceEvent({ event: "source.validation_failed", reason: "invalid_url" }, "warn");
    throw new IngestionError("Source URL is invalid.");
  }
  if (url.protocol !== "https:") throw new IngestionError("Only HTTPS source URLs are accepted.");
  if (url.username || url.password || url.hostname === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname) || url.hostname.includes(":")) throw new IngestionError("Source URL is not safe for server-side retrieval.");
  return url;
}

export async function validateRegisteredSource(url: URL, repository: RadarRepository): Promise<SourceDefinition> {
  const source = await repository.findSourceDefinitionByDomain(url.hostname);
  if (!source) {
    logSourceEvent({ event: "source.validation_failed", canonicalDomain: url.hostname, reason: "not_registered" }, "warn");
    throw new IngestionError("Source is not registered.", 400);
  }
  if (source.status === "archived") {
    logSourceEvent({ event: "source.validation_failed", sourceDefinitionId: source.id, canonicalDomain: source.canonicalDomain, reason: "archived" }, "warn");
    throw new IngestionError("Archived sources cannot be processed.", 403);
  }
  if (source.status !== "enabled") {
    logSourceEvent({ event: "source.validation_failed", sourceDefinitionId: source.id, canonicalDomain: source.canonicalDomain, reason: "not_enabled" }, "warn");
    throw new IngestionError("Source is not enabled.", 403);
  }
  if (!TRUSTED_SOURCE_LEVELS.includes(source.trustLevel as typeof TRUSTED_SOURCE_LEVELS[number])) {
    logSourceEvent({ event: "source.validation_failed", sourceDefinitionId: source.id, canonicalDomain: source.canonicalDomain, reason: "not_trusted" }, "warn");
    throw new IngestionError("Source trust level is not permitted for production.", 403);
  }
  return source;
}

async function fetchAllowed(url: URL, definition: SourceDefinition, fetcher: typeof fetch) {
  let current = url;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetcher(current, { redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { "user-agent": "LAFRYHI-AI-Radar/0.1 (+https://lafryhi.com)" } });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location || redirects === 3) throw new IngestionError("Source redirect could not be followed safely.");
    current = validateSourceUrl(new URL(location, current).toString());
    const allowed = current.hostname === definition.canonicalDomain || current.hostname.endsWith(`.${definition.canonicalDomain}`);
    if (!allowed) throw new IngestionError("Source redirect left the registered domain.");
  }
  throw new IngestionError("Too many source redirects.");
}

function decode(value: string) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

export async function ingestSource(input: string, repository: RadarRepository, fetcher: typeof fetch = fetch): Promise<SourceRecord> {
  const url = validateSourceUrl(input);
  const definition = await validateRegisteredSource(url, repository);
  const response = await fetchAllowed(url, definition, fetcher);
  if (!response.ok) throw new IngestionError(`Source fetch failed with HTTP ${response.status}.`);
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("text/html")) throw new IngestionError("Only HTML announcements are supported in Phase 1.");
  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (declaredLength > MAX_BYTES) throw new IngestionError("Source exceeds the 1 MB limit.");
  const html = await response.text();
  if (Buffer.byteLength(html, "utf8") > MAX_BYTES) throw new IngestionError("Source exceeds the 1 MB limit.");
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim());
  const dateValue = html.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished|date)["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1];
  const body = decode(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  if (!title || body.length < 200) throw new IngestionError("Source content is missing or too short.");
  const published = dateValue ? new Date(dateValue) : null;
  if (!published || Number.isNaN(published.getTime())) throw new IngestionError("A trustworthy publication date could not be extracted.");
  const normalizedText = body.slice(0, 100_000);
  const contentHash = createHash("sha256").update(normalizedText).digest("hex");
  if (await repository.findSourceByHash(contentHash)) throw new DuplicateSourceError("This content has already been ingested.");
  return SourceRecordSchema.parse({
    id: randomUUID(), sourceDefinitionId: definition.id, sourceUrl: url.toString(), sourceName: definition.publisher,
    title, publishedAt: published.toISOString(), fetchedAt: new Date().toISOString(),
    normalizedText, contentHash, sourceType: "official_announcement",
  });
}
