import { ProcessingRunSchema, RadarItemSchema, ReviewDecisionSchema, RssCandidateSchema, RssDiscoveryRunSchema, SourceDefinitionSchema, SourceRecordSchema, StoredAnalysisSchema, type ProcessingRun, type RadarItem, type ReviewDecision, type RssCandidate, type RssDiscoveryRun, type SourceDefinition, type SourceRecord, type StoredAnalysis } from "@/domain/schemas";
import { ApprovalIntegrityError, buildApprovalRecords, type AtomicApprovalResult, type RadarRepository } from "./repository";

export class MemoryRepository implements RadarRepository {
  protected sourceDefinitions = new Map<string, SourceDefinition>();
  protected rssCandidates = new Map<string, RssCandidate>();
  protected rssDiscoveryRuns = new Map<string, RssDiscoveryRun>();
  protected sources = new Map<string, SourceRecord>();
  protected runs = new Map<string, ProcessingRun>();
  protected analyses = new Map<string, StoredAnalysis>();
  protected reviews = new Map<string, ReviewDecision>();
  protected items = new Map<string, RadarItem>();

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
  async findRadarItemByAnalysis(id: string) { return [...this.items.values()].find((x) => x.analysisResultId === id) ?? null; }
  protected async commitApproval(decision: ReviewDecision, item: RadarItem) {
    this.reviews.set(decision.id, decision);
    this.items.set(item.id, item);
  }
  async approveReviewAndPublish(analysisId: string, note: string, reviewedAt: string): Promise<AtomicApprovalResult> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) throw new ApprovalIntegrityError("Approval integrity error: analysis not found.");
    const source = this.sources.get(analysis.sourceRecordId);
    if (!source) throw new ApprovalIntegrityError("Approval integrity error: source record not found.");
    const reviews = [...this.reviews.values()].filter((review) => review.analysisResultId === analysisId);
    if (reviews.length === 0) throw new ApprovalIntegrityError("Approval integrity error: no review exists for this analysis.");
    if (reviews.length > 1) throw new ApprovalIntegrityError("Approval integrity error: multiple reviews exist for this analysis.");
    const review = reviews[0];
    const matchingItems = [...this.items.values()].filter((item) => item.analysisResultId === analysisId);
    if (matchingItems.length > 1) throw new ApprovalIntegrityError("Approval integrity error: multiple Radar items exist for this analysis.");
    const existingItem = matchingItems[0] ?? null;
    const expectedItemId = `radar-${analysisId}`;
    if (existingItem && existingItem.id !== expectedItemId) {
      throw new ApprovalIntegrityError("Approval integrity error: the existing Radar item has a non-deterministic identifier.");
    }
    if (review.status === "approved") {
      if (!existingItem) throw new ApprovalIntegrityError("Approval integrity error: approved review is missing its Radar item.");
      return { decision: review, item: existingItem, idempotent: true };
    }
    if (existingItem) throw new ApprovalIntegrityError("Approval integrity error: an unpublished review already has a Radar item.");
    if (review.status === "rejected") throw new ApprovalIntegrityError("Approval integrity error: a rejected review cannot be published.");
    if (!["pending", "needs_changes"].includes(review.status)) {
      throw new ApprovalIntegrityError("Approval integrity error: review status cannot transition to approved.");
    }
    const records = buildApprovalRecords(analysis, source, review, note, reviewedAt);
    await this.commitApproval(records.decision, records.item);
    return { ...records, idempotent: false };
  }
  async listPublishedItems(limit = 100) { return [...this.items.values()].filter((x) => x.publicationState === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit); }
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
