import { ProcessingRunSchema, RadarItemSchema, ReviewDecisionSchema, RssCandidateSchema, RssDiscoveryRunSchema, SourceDefinitionSchema, SourceRecordSchema, StoredAnalysisSchema, type ProcessingRun, type RadarItem, type ReviewDecision, type RssCandidate, type RssDiscoveryRun, type SourceDefinition, type SourceRecord, type StoredAnalysis } from "@/domain/schemas";
import type { RadarRepository } from "./repository";
import { BusinessProfileSchema, StoredDecisionBriefSchema, type BusinessProfile, type StoredDecisionBrief } from "@/domain/public-mvp";
import { DecisionActionSchema, DecisionFeedbackSchema, type DecisionAction, type DecisionFeedback } from "@/domain/decision-progress";

export class MemoryRepository implements RadarRepository {
  protected sourceDefinitions = new Map<string, SourceDefinition>();
  protected rssCandidates = new Map<string, RssCandidate>();
  protected rssDiscoveryRuns = new Map<string, RssDiscoveryRun>();
  protected sources = new Map<string, SourceRecord>();
  protected runs = new Map<string, ProcessingRun>();
  protected analyses = new Map<string, StoredAnalysis>();
  protected reviews = new Map<string, ReviewDecision>();
  protected items = new Map<string, RadarItem>();
  protected businessProfiles = new Map<string, BusinessProfile>();
  protected decisionBriefs = new Map<string, StoredDecisionBrief>();
  protected decisionFeedback = new Map<string, DecisionFeedback>();
  protected decisionActions = new Map<string, DecisionAction>();

  async getSourceDefinition(id: string) { return this.sourceDefinitions.get(id) ?? null; }
  async findSourceDefinitionByDomain(domain: string) { return [...this.sourceDefinitions.values()].find((x) => x.canonicalDomain === domain || domain.endsWith(`.${x.canonicalDomain}`)) ?? null; }
  async saveSourceDefinition(value: SourceDefinition) { const parsed = SourceDefinitionSchema.parse(value); this.sourceDefinitions.set(parsed.id, parsed); }
  async listSourceDefinitions(limit = 100) { return [...this.sourceDefinitions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit); }
  async countSourceDefinitions() { return this.sourceDefinitions.size; }
  async getRssCandidate(id: string) { return this.rssCandidates.get(id) ?? null; }
  async findRssCandidateByUrl(normalizedUrl: string) { return [...this.rssCandidates.values()].find((x) => x.normalizedUrl === normalizedUrl) ?? null; }
  async findRssCandidateByFeedId(sourceDefinitionId: string, feedItemIdHash: string) { return [...this.rssCandidates.values()].find((x) => x.sourceDefinitionId === sourceDefinitionId && x.feedItemIdHash === feedItemIdHash) ?? null; }
  async saveRssCandidate(value: RssCandidate) { const parsed = RssCandidateSchema.parse(value); this.rssCandidates.set(parsed.id, parsed); }
  async listRssCandidates(sourceDefinitionId: string, limit = 50) { return [...this.rssCandidates.values()].filter((x) => x.sourceDefinitionId === sourceDefinitionId).sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt)).slice(0, limit); }
  async saveRssDiscoveryRun(value: RssDiscoveryRun) { const parsed = RssDiscoveryRunSchema.parse(value); this.rssDiscoveryRuns.set(parsed.id, parsed); }
  async listRssDiscoveryRuns(sourceDefinitionId?: string, limit = 50) { return [...this.rssDiscoveryRuns.values()].filter((x) => !sourceDefinitionId || x.sourceDefinitionId === sourceDefinitionId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit); }
  async findSourceByUrl(normalizedUrl: string) { return [...this.sources.values()].find((x) => x.sourceUrl === normalizedUrl) ?? null; }
  async findSourceByHash(hash: string) { return [...this.sources.values()].find((x) => x.contentHash === hash) ?? null; }
  async getSource(id: string) { return this.sources.get(id) ?? null; }
  async saveSource(value: SourceRecord) { const parsed = SourceRecordSchema.parse(value); this.sources.set(parsed.id, parsed); }
  async listSources(limit = 100) { return [...this.sources.values()].sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt)).slice(0, limit); }
  async getRun(id: string) { return this.runs.get(id) ?? null; }
  async saveRun(value: ProcessingRun) { const parsed = ProcessingRunSchema.parse(value); this.runs.set(parsed.id, parsed); }
  async listRuns(limit = 100) { return [...this.runs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit); }
  async saveAnalysis(value: StoredAnalysis) { const parsed = StoredAnalysisSchema.parse(value); this.analyses.set(parsed.id, parsed); }
  async getAnalysis(id: string) { return this.analyses.get(id) ?? null; }
  async listAnalyses(limit = 100) { return [...this.analyses.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
  async saveReview(value: ReviewDecision) { const parsed = ReviewDecisionSchema.parse(value); this.reviews.set(parsed.id, parsed); }
  async getReviewForAnalysis(id: string) { return [...this.reviews.values()].find((x) => x.analysisResultId === id) ?? null; }
  async listReviews(limit = 100) { return [...this.reviews.values()].sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? "")).slice(0, limit); }
  async saveRadarItem(value: RadarItem) { const parsed = RadarItemSchema.parse(value); this.items.set(parsed.id, parsed); }
  async getRadarItem(id: string) { return this.items.get(id) ?? null; }
  async findRadarItemByAnalysis(id: string) { return [...this.items.values()].find((x) => x.analysisResultId === id) ?? null; }
  async listPublishedItems(limit = 100) { return [...this.items.values()].filter((x) => x.publicationState === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit); }
  async saveBusinessProfile(value: BusinessProfile) { const parsed = BusinessProfileSchema.parse(value); this.businessProfiles.set(parsed.id, parsed); }
  async getBusinessProfile(id: string) { return this.businessProfiles.get(id) ?? null; }
  async findBusinessProfileByOwner(ownerId: string) { return [...this.businessProfiles.values()].find((x) => x.ownerId === ownerId) ?? null; }
  async listBusinessProfilesByOwner(ownerId: string, limit = 100) { return [...this.businessProfiles.values()].filter((x) => x.ownerId === ownerId).slice(0, limit); }
  async listAllBusinessProfiles(limit = 10_000) { return [...this.businessProfiles.values()].slice(0, limit); }
  async saveDecisionBrief(value: StoredDecisionBrief) { const parsed = StoredDecisionBriefSchema.parse(value); this.decisionBriefs.set(parsed.id, parsed); }
  async getDecisionBrief(id: string) { return this.decisionBriefs.get(id) ?? null; }
  async listDecisionBriefsByOwner(ownerId: string, limit = 100) { return [...this.decisionBriefs.values()].filter((x) => x.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
  async listAllDecisionBriefs(limit = 10_000) { return [...this.decisionBriefs.values()].slice(0, limit); }
  async saveDecisionFeedback(value: DecisionFeedback) { const parsed = DecisionFeedbackSchema.parse(value); this.decisionFeedback.set(parsed.id, parsed); }
  async findDecisionFeedbackByBrief(decisionBriefId: string) { return [...this.decisionFeedback.values()].find((x) => x.decisionBriefId === decisionBriefId) ?? null; }
  async listDecisionFeedbackByOwner(ownerId: string, limit = 100) { return [...this.decisionFeedback.values()].filter((x) => x.ownerId === ownerId).slice(0, limit); }
  async listAllDecisionFeedback(limit = 10_000) { return [...this.decisionFeedback.values()].slice(0, limit); }
  async saveDecisionAction(value: DecisionAction) { const parsed = DecisionActionSchema.parse(value); this.decisionActions.set(parsed.id, parsed); }
  async findDecisionActionByBrief(decisionBriefId: string) { return [...this.decisionActions.values()].find((x) => x.decisionBriefId === decisionBriefId) ?? null; }
  async listDecisionActionsByOwner(ownerId: string, limit = 100) { return [...this.decisionActions.values()].filter((x) => x.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit); }
  async listAllDecisionActions(limit = 10_000) { return [...this.decisionActions.values()].slice(0, limit); }
  async getOperatorCounts() {
    const reviews = [...this.reviews.values()];
    const runs = [...this.runs.values()];
    return {
      pendingReviews: reviews.filter((x) => x.status === "pending" || x.status === "needs_changes").length,
      approvedReviews: reviews.filter((x) => x.status === "approved").length,
      rejectedReviews: reviews.filter((x) => x.status === "rejected").length,
      publishedItems: [...this.items.values()].filter((x) => x.publicationState === "published").length,
      failedRuns: runs.filter((x) => x.status === "failed").length,
      completedRuns: runs.filter((x) => x.status === "pending_review").length,
      totalSources: this.sources.size,
    };
  }
}
