import { RadarItemSchema, ReviewDecisionSchema, type ProcessingRun, type RadarItem, type ReviewDecision, type RssCandidate, type RssDiscoveryRun, type SourceDefinition, type SourceRecord, type StoredAnalysis } from "@/domain/schemas";

export class ApprovalIntegrityError extends Error {}

export interface AtomicApprovalResult {
  decision: ReviewDecision;
  item: RadarItem;
  idempotent: boolean;
}

export function buildApprovalRecords(analysis: StoredAnalysis, source: SourceRecord, review: ReviewDecision, note: string, reviewedAt: string) {
  const decision = ReviewDecisionSchema.parse({
    ...review,
    status: "approved",
    reviewerNote: note.trim(),
    reviewedAt,
  });
  const item = RadarItemSchema.parse({
    id: `radar-${analysis.id}`,
    publicTitle: source.title,
    publicSummary: analysis.summary,
    whyItMatters: analysis.whyItMatters,
    recommendedAction: analysis.recommendedAction,
    category: analysis.category,
    relevanceScore: analysis.relevanceScore,
    confidenceScore: analysis.confidenceScore,
    originalSourceUrl: source.sourceUrl,
    sourceName: source.sourceName,
    sourcePublishedAt: source.publishedAt,
    publicationState: "published",
    sourceRecordId: source.id,
    processingRunId: analysis.processingRunId,
    analysisResultId: analysis.id,
    reviewDecisionId: decision.id,
    publishedAt: reviewedAt,
  });
  return { decision, item };
}

export interface OperatorCounts {
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  publishedItems: number;
  failedRuns: number;
  completedRuns: number;
  totalSources: number;
}

export interface RadarRepository {
  getSourceDefinition(id: string): Promise<SourceDefinition | null>;
  findSourceDefinitionByDomain(domain: string): Promise<SourceDefinition | null>;
  saveSourceDefinition(value: SourceDefinition): Promise<void>;
  listSourceDefinitions(limit?: number): Promise<SourceDefinition[]>;
  countSourceDefinitions(): Promise<number>;
  getRssCandidate(id: string): Promise<RssCandidate | null>;
  findRssCandidateByUrl(normalizedUrl: string): Promise<RssCandidate | null>;
  findRssCandidateByFeedId(sourceDefinitionId: string, feedItemIdHash: string): Promise<RssCandidate | null>;
  saveRssCandidate(value: RssCandidate): Promise<void>;
  listRssCandidates(sourceDefinitionId: string, limit?: number): Promise<RssCandidate[]>;
  saveRssDiscoveryRun(value: RssDiscoveryRun): Promise<void>;
  listRssDiscoveryRuns(sourceDefinitionId?: string, limit?: number): Promise<RssDiscoveryRun[]>;
  findSourceByUrl(normalizedUrl: string): Promise<SourceRecord | null>;
  findSourceByHash(hash: string): Promise<SourceRecord | null>;
  getSource(id: string): Promise<SourceRecord | null>;
  saveSource(value: SourceRecord): Promise<void>;
  listSources(limit?: number): Promise<SourceRecord[]>;
  getRun(id: string): Promise<ProcessingRun | null>;
  saveRun(value: ProcessingRun): Promise<void>;
  listRuns(limit?: number): Promise<ProcessingRun[]>;
  saveAnalysis(value: StoredAnalysis): Promise<void>;
  getAnalysis(id: string): Promise<StoredAnalysis | null>;
  listAnalyses(limit?: number): Promise<StoredAnalysis[]>;
  saveReview(value: ReviewDecision): Promise<void>;
  getReviewForAnalysis(id: string): Promise<ReviewDecision | null>;
  listReviews(limit?: number): Promise<ReviewDecision[]>;
  saveRadarItem(value: RadarItem): Promise<void>;
  findRadarItemByAnalysis(id: string): Promise<RadarItem | null>;
  approveReviewAndPublish(analysisId: string, note: string, reviewedAt: string): Promise<AtomicApprovalResult>;
  listPublishedItems(limit?: number): Promise<RadarItem[]>;
  getOperatorCounts(): Promise<OperatorCounts>;
}
