import type { ProcessingRun, RadarItem, ReviewDecision, SourceRecord, StoredAnalysis } from "@/domain/schemas";
import type { RadarRepository } from "@/persistence/repository";

export const OPERATOR_QUERY_LIMIT = 100;

export interface ReviewQueueEntry {
  analysis: StoredAnalysis;
  review: ReviewDecision;
  source: SourceRecord;
  run: ProcessingRun;
  radarItem: RadarItem | null;
  processingMode: "initial" | "rerun";
}

export type ReviewFilters = {
  status?: string;
  category?: string;
  publisher?: string;
  company?: string;
  technology?: string;
  recommendation?: string;
  minRelevance?: number;
  minImportance?: number;
  minNovelty?: number;
  minConfidence?: number;
  sort?: "newest" | "oldest" | "relevance" | "importance" | "novelty" | "confidence";
};

export async function getReviewQueue(repository: RadarRepository, filters: ReviewFilters = {}) {
  const [analyses, reviews, sources, runs, items] = await Promise.all([
    repository.listAnalyses(OPERATOR_QUERY_LIMIT),
    repository.listReviews(OPERATOR_QUERY_LIMIT),
    repository.listSources(OPERATOR_QUERY_LIMIT),
    repository.listRuns(OPERATOR_QUERY_LIMIT),
    repository.listPublishedItems(OPERATOR_QUERY_LIMIT),
  ]);
  const sourceById = new Map(sources.map((x) => [x.id, x]));
  const runById = new Map(runs.map((x) => [x.id, x]));
  const reviewByAnalysis = new Map(reviews.map((x) => [x.analysisResultId, x]));
  const itemByAnalysis = new Map(items.map((x) => [x.analysisResultId, x]));
  const runsBySource = new Map<string, ProcessingRun[]>();
  for (const run of runs.slice().reverse()) {
    runsBySource.set(run.sourceRecordId, [...(runsBySource.get(run.sourceRecordId) ?? []), run]);
  }

  let entries = analyses.flatMap((analysis): ReviewQueueEntry[] => {
    const source = sourceById.get(analysis.sourceRecordId);
    const run = runById.get(analysis.processingRunId);
    const review = reviewByAnalysis.get(analysis.id);
    if (!source || !run || !review) return [];
    const sequence = runsBySource.get(source.id) ?? [];
    return [{ analysis, source, run, review, radarItem: itemByAnalysis.get(analysis.id) ?? null, processingMode: sequence[0]?.id === run.id ? "initial" : "rerun" }];
  });

  if (filters.status && filters.status !== "all") {
    entries = entries.filter((x) => filters.status === "published" ? Boolean(x.radarItem) : x.review.status === filters.status);
  }
  if (filters.category && filters.category !== "all") entries = entries.filter((x) => x.analysis.category === filters.category);
  if (filters.publisher) entries = entries.filter((x) => x.source.sourceName.toLowerCase().includes(filters.publisher!.toLowerCase()));
  if (filters.company) {
    const company = filters.company.toLowerCase();
    entries = entries.filter((x) =>
      x.analysis.mentionedCompanies.some((value) => value.toLowerCase().includes(company)) ||
      x.analysis.entities.some((entity) => entity.type === "company" && entity.normalizedName.toLowerCase().includes(company)));
  }
  if (filters.technology) {
    const technology = filters.technology.toLowerCase();
    const technologyTypes = new Set(["technology", "model", "programming_language", "cloud_platform", "standard", "api", "framework"]);
    entries = entries.filter((x) =>
      x.analysis.mentionedTechnologies.some((value) => value.toLowerCase().includes(technology)) ||
      x.analysis.entities.some((entity) => technologyTypes.has(entity.type) && entity.normalizedName.toLowerCase().includes(technology)));
  }
  if (filters.recommendation && filters.recommendation !== "all") entries = entries.filter((x) => x.analysis.overallRecommendation === filters.recommendation);
  if (filters.minRelevance !== undefined) entries = entries.filter((x) => x.analysis.relevanceScore >= filters.minRelevance!);
  if (filters.minImportance !== undefined) entries = entries.filter((x) => x.analysis.importanceScore >= filters.minImportance!);
  if (filters.minNovelty !== undefined) entries = entries.filter((x) => x.analysis.noveltyScore >= filters.minNovelty!);
  if (filters.minConfidence !== undefined) entries = entries.filter((x) => x.analysis.confidenceScore >= filters.minConfidence!);

  return entries.sort((a, b) => {
    if (filters.sort === "oldest") return a.analysis.createdAt.localeCompare(b.analysis.createdAt);
    if (filters.sort === "relevance") return b.analysis.relevanceScore - a.analysis.relevanceScore;
    if (filters.sort === "importance") return b.analysis.importanceScore - a.analysis.importanceScore;
    if (filters.sort === "novelty") return b.analysis.noveltyScore - a.analysis.noveltyScore;
    if (filters.sort === "confidence") return b.analysis.confidenceScore - a.analysis.confidenceScore;
    return b.analysis.createdAt.localeCompare(a.analysis.createdAt);
  });
}

function topCounts(values: string[], limit = 5) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    const key = value.trim().toLocaleLowerCase();
    if (!key) continue;
    const current = counts.get(key);
    counts.set(key, { label: current?.label ?? value.trim(), count: (current?.count ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit);
}

export function calculateDecisionMetrics(queue: ReviewQueueEntry[]) {
  const analyses = queue.map((entry) => entry.analysis);
  const count = analyses.length;
  const average = (values: number[]) => count ? Math.round(values.reduce((sum, value) => sum + value, 0) / count) : 0;
  return {
    averageImportance: average(analyses.map((analysis) => analysis.importanceScore)),
    averageConfidence: average(analyses.map((analysis) => analysis.confidenceScore)),
    mostCommonTechnologies: topCounts(analyses.flatMap((analysis) => analysis.mentionedTechnologies)),
    mostCommonCompanies: topCounts(analyses.flatMap((analysis) => analysis.mentionedCompanies)),
    topCategories: topCounts(analyses.map((analysis) => analysis.category.replaceAll("_", " "))),
    recommendationDistribution: topCounts(analyses.map((analysis) => analysis.overallRecommendation)),
    duplicateRate: count ? Math.round(analyses.filter((analysis) => analysis.duplicateAnalysis.classification !== "unique").length / count * 100) : 0,
  };
}

export async function getReviewDetail(repository: RadarRepository, analysisId: string): Promise<ReviewQueueEntry | null> {
  const analysis = await repository.getAnalysis(analysisId);
  if (!analysis) return null;
  const [source, run, review, item, sourceRuns] = await Promise.all([
    repository.getSource(analysis.sourceRecordId),
    repository.getRun(analysis.processingRunId),
    repository.getReviewForAnalysis(analysis.id),
    repository.findRadarItemByAnalysis(analysis.id),
    repository.listRuns(OPERATOR_QUERY_LIMIT),
  ]);
  if (!source || !run || !review) return null;
  const ordered = sourceRuns.filter((x) => x.sourceRecordId === source.id).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return { analysis, source, run, review, radarItem: item, processingMode: ordered[0]?.id === run.id ? "initial" : "rerun" };
}

export async function getDashboardData(repository: RadarRepository) {
  const [counts, queue, runs] = await Promise.all([
    repository.getOperatorCounts(),
    getReviewQueue(repository),
    repository.listRuns(20),
  ]);
  return {
    counts,
    decisionMetrics: calculateDecisionMetrics(queue),
    pending: queue.filter((x) => x.review.status === "pending" || x.review.status === "needs_changes").slice(0, 5),
    latestApproved: queue.find((x) => x.review.status === "approved") ?? null,
    latestFailedRun: runs.find((x) => x.status === "failed") ?? null,
    lastSuccessfulCompletion: runs.find((x) => x.status === "pending_review")?.completedAt ?? null,
  };
}
