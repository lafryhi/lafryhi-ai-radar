import type { ProcessingRun, RadarItem, ReviewDecision, RssCandidate, RssDiscoveryRun, SourceDefinition, SourceRecord, StoredAnalysis } from "@/domain/schemas";
import type { BusinessProfile, StoredDecisionBrief } from "@/domain/public-mvp";

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
  getRadarItem(id: string): Promise<RadarItem | null>;
  findRadarItemByAnalysis(id: string): Promise<RadarItem | null>;
  listPublishedItems(limit?: number): Promise<RadarItem[]>;
  saveBusinessProfile(value: BusinessProfile): Promise<void>;
  getBusinessProfile(id: string): Promise<BusinessProfile | null>;
  findBusinessProfileByOwner(ownerId: string): Promise<BusinessProfile | null>;
  saveDecisionBrief(value: StoredDecisionBrief): Promise<void>;
  getDecisionBrief(id: string): Promise<StoredDecisionBrief | null>;
  listDecisionBriefsByOwner(ownerId: string, limit?: number): Promise<StoredDecisionBrief[]>;
  getOperatorCounts(): Promise<OperatorCounts>;
}
