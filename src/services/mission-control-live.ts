import type { IntelligenceItem, LiveCollectionSummary, MissionControlRequest, PipelineLogEntry } from "@/domain/mission-control";
import type { RssCandidate, RssDiscoveryRun, SourceDefinition } from "@/domain/schemas";
import type { RadarRepository } from "@/persistence/repository";
import { TRUSTED_SOURCE_LEVELS } from "@/services/source-management";
import { discoverRss } from "@/services/rss-discovery";

const SOURCE_LIMIT = 200;
const CANDIDATE_LIMIT = 50;
const LIVE_SUMMARY = "Live collection record; analysis is deferred until Sprint 3.2.";

export interface LiveCollectionResult {
  items: IntelligenceItem[];
  summary: LiveCollectionSummary;
  logs: PipelineLogEntry[];
  status: "success" | "warning" | "error";
}

export interface LiveCollectionDependencies {
  discover?: typeof discoverRss;
  now?: () => Date;
}

export function isEligibleLiveSource(source: SourceDefinition) {
  return source.status === "enabled"
    && TRUSTED_SOURCE_LEVELS.includes(source.trustLevel as typeof TRUSTED_SOURCE_LEVELS[number])
    && Boolean(source.rssUrl);
}

export function selectEligibleLiveSources(sources: SourceDefinition[]) {
  return [...sources]
    .filter(isEligibleLiveSource)
    .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.id.localeCompare(right.id));
}

function inPeriod(candidate: RssCandidate, period: MissionControlRequest["period"]) {
  const timestamp = candidate.publishedAt ?? candidate.discoveredAt;
  const value = new Date(timestamp).getTime();
  return value >= new Date(period.start).getTime() && value <= new Date(period.end).getTime();
}

export function normalizeLiveCandidate(candidate: RssCandidate): IntelligenceItem {
  const createdAt = candidate.publishedAt ?? candidate.discoveredAt;
  return {
    id: `live-${candidate.id}`,
    title: candidate.title,
    summary: candidate.summary && candidate.summary.length >= 20 ? candidate.summary : LIVE_SUMMARY,
    sourceName: candidate.publisher,
    sourceDefinitionId: candidate.sourceDefinitionId,
    sourceUrl: candidate.articleUrl,
    category: "Live collection",
    impactScore: 0,
    confidenceScore: 0,
    evidenceCount: 0,
    verificationStatus: "pending",
    editorialStatus: "pending",
    analysisStatus: "deferred",
    createdAt,
  };
}

function logEntry(index: number, timestamp: string, level: PipelineLogEntry["level"], message: string): PipelineLogEntry {
  return { id: `live-collect-log-${index + 1}`, timestamp, stage: "collect", level, message };
}

function hasUsableResults(run: RssDiscoveryRun, candidates: RssCandidate[]) {
  return run.feedsSucceeded > 0 || candidates.length > 0;
}

export async function collectLiveIntelligenceItems(repository: RadarRepository, request: MissionControlRequest, dependencies: LiveCollectionDependencies = {}): Promise<LiveCollectionResult> {
  const now = dependencies.now ?? (() => new Date());
  const timestamp = now().toISOString();
  let sources: SourceDefinition[];
  try {
    sources = await repository.listSourceDefinitions(SOURCE_LIMIT);
  } catch {
    return { items: [], summary: { totalRegistrySources: 0, eligibleLiveSources: 0, attemptedSources: 0, successfulSources: 0, failedSources: 0, duplicateRecords: 0, recordsCollected: 0 }, logs: [logEntry(0, timestamp, "error", "Trusted source registry could not be loaded safely.")], status: "error" };
  }
  const eligible = selectEligibleLiveSources(sources);
  const logs: PipelineLogEntry[] = [logEntry(0, timestamp, "info", "Loading trusted source registry..."), logEntry(1, timestamp, "info", `${eligible.length} eligible live sources found.`)];
  if (!eligible.length) return { items: [], summary: { totalRegistrySources: sources.length, eligibleLiveSources: 0, attemptedSources: 0, successfulSources: 0, failedSources: 0, duplicateRecords: 0, recordsCollected: 0 }, logs: [...logs, logEntry(logs.length, timestamp, "warning", "No eligible trusted sources are configured for live collection.")], status: "warning" };

  const discover = dependencies.discover ?? discoverRss;
  const candidates: RssCandidate[] = [];
  const seen = new Set<string>();
  let successfulSources = 0;
  let failedSources = 0;
  let duplicateRecords = 0;
  for (const source of eligible) {
    logs.push(logEntry(logs.length, timestamp, "info", `Collecting from ${source.displayName}...`));
    try {
      const run = await discover(repository, "manual", source.id);
      const storedCandidates = await repository.listRssCandidates(
        source.id,
        CANDIDATE_LIMIT,
      );

      const currentRunCandidates = storedCandidates.filter(
        (candidate) =>
          candidate.discoveryRunId === run.id
          && inPeriod(candidate, request.period),
      );

      const sourceCandidates =
        currentRunCandidates.length > 0
          ? currentRunCandidates
          : storedCandidates.filter((candidate) =>
              inPeriod(candidate, request.period),
            );
      if (hasUsableResults(run, sourceCandidates)) successfulSources += 1;
      if (run.feedsFailed > 0) failedSources += 1;
      for (const candidate of sourceCandidates) {
        const key = candidate.normalizedUrl || candidate.feedItemIdHash || candidate.id;
        if (seen.has(key)) { duplicateRecords += 1; continue; }
        seen.add(key); candidates.push(candidate);
      }
      if (run.feedsFailed > 0) logs.push(logEntry(logs.length, timestamp, "warning", `${source.displayName} returned partial collection warnings.`));
      else logs.push(logEntry(logs.length, timestamp, "success", `${sourceCandidates.length} records collected from ${source.displayName}.`));
    } catch {
      failedSources += 1;
      logs.push(logEntry(logs.length, timestamp, "warning", `${source.displayName} could not be collected and was skipped.`));
    }
  }
  const items = candidates.sort((left, right) => (right.publishedAt ?? right.discoveredAt).localeCompare(left.publishedAt ?? left.discoveredAt) || left.id.localeCompare(right.id)).map(normalizeLiveCandidate);
  const status = items.length === 0 && failedSources === eligible.length ? "error" : failedSources > 0 ? "warning" : "success";
  logs.push(logEntry(logs.length, timestamp, status === "success" ? "success" : status, status === "error" ? "Live collection failed; no usable records were returned." : `Live collection completed with ${items.length} usable records.`));
  return { items, summary: { totalRegistrySources: sources.length, eligibleLiveSources: eligible.length, attemptedSources: eligible.length, successfulSources, failedSources, duplicateRecords, recordsCollected: items.length }, logs, status };
}
