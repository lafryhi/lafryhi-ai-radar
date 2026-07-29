import { Firestore } from "@google-cloud/firestore";
import { ProcessingRunSchema, RadarItemSchema, ReviewDecisionSchema, RssCandidateSchema, RssDiscoveryRunSchema, SourceDefinitionSchema, SourceRecordSchema, StoredAnalysisSchema, type ProcessingRun, type RadarItem, type ReviewDecision, type RssCandidate, type RssDiscoveryRun, type SourceDefinition, type SourceRecord, type StoredAnalysis } from "@/domain/schemas";
import type { RadarRepository } from "./repository";
import { BusinessProfileSchema, StoredDecisionBriefSchema, type BusinessProfile, type StoredDecisionBrief } from "@/domain/public-mvp";
import { DecisionActionSchema, DecisionFeedbackSchema, type DecisionAction, type DecisionFeedback } from "@/domain/decision-progress";

export class FirestoreRepository implements RadarRepository {
  private db = new Firestore({ databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)" });
  private col(name: string) { return this.db.collection(name); }
  async getSourceDefinition(id: string) { const d = await this.col("sourceRegistry").doc(id).get(); return d.exists ? SourceDefinitionSchema.parse(d.data()) : null; }
  async findSourceDefinitionByDomain(domain: string) {
    const exact = await this.col("sourceRegistry").where("canonicalDomain", "==", domain).limit(1).get();
    if (!exact.empty) return SourceDefinitionSchema.parse(exact.docs[0].data());
    const candidates = await this.col("sourceRegistry").limit(100).get();
    const value = candidates.docs.map((d) => SourceDefinitionSchema.parse(d.data())).find((x) => domain.endsWith(`.${x.canonicalDomain}`));
    return value ?? null;
  }
  async saveSourceDefinition(v: SourceDefinition) { const x = SourceDefinitionSchema.parse(v); await this.col("sourceRegistry").doc(x.id).set(x); }
  async listSourceDefinitions(limit = 100) { return (await this.col("sourceRegistry").orderBy("updatedAt", "desc").limit(limit).get()).docs.map((d) => SourceDefinitionSchema.parse(d.data())); }
  async countSourceDefinitions() { return (await this.col("sourceRegistry").count().get()).data().count; }
  async getRssCandidate(id: string) { const d = await this.col("rssCandidates").doc(id).get(); return d.exists ? RssCandidateSchema.parse(d.data()) : null; }
  async findRssCandidateByUrl(normalizedUrl: string) { const s = await this.col("rssCandidates").where("normalizedUrl", "==", normalizedUrl).limit(1).get(); return s.empty ? null : RssCandidateSchema.parse(s.docs[0].data()); }
  async findRssCandidateByFeedId(sourceDefinitionId: string, feedItemIdHash: string) { const s = await this.col("rssCandidates").where("sourceDefinitionId", "==", sourceDefinitionId).where("feedItemIdHash", "==", feedItemIdHash).limit(1).get(); return s.empty ? null : RssCandidateSchema.parse(s.docs[0].data()); }
  async saveRssCandidate(v: RssCandidate) { const x = RssCandidateSchema.parse(v); await this.col("rssCandidates").doc(x.id).set(x); }
  async listRssCandidates(sourceDefinitionId: string, limit = 50) { const s = await this.col("rssCandidates").where("sourceDefinitionId", "==", sourceDefinitionId).limit(limit).get(); return s.docs.map((d) => RssCandidateSchema.parse(d.data())).sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt)); }
  async saveRssDiscoveryRun(v: RssDiscoveryRun) { const x = RssDiscoveryRunSchema.parse(v); await this.col("rssDiscoveryRuns").doc(x.id).set(x); }
  async listRssDiscoveryRuns(sourceDefinitionId?: string, limit = 50) { let q: FirebaseFirestore.Query = this.col("rssDiscoveryRuns"); if (sourceDefinitionId) q = q.where("sourceDefinitionId", "==", sourceDefinitionId); const s = await q.limit(limit).get(); return s.docs.map((d) => RssDiscoveryRunSchema.parse(d.data())).sort((a, b) => b.startedAt.localeCompare(a.startedAt)); }
  async findSourceByUrl(normalizedUrl: string) { const s = await this.col("sourceRecords").where("sourceUrl", "==", normalizedUrl).limit(1).get(); return s.empty ? null : SourceRecordSchema.parse(s.docs[0].data()); }
  async findSourceByHash(hash: string) { const s = await this.col("sourceRecords").where("contentHash", "==", hash).limit(1).get(); return s.empty ? null : SourceRecordSchema.parse(s.docs[0].data()); }
  async getSource(id: string) { const d = await this.col("sourceRecords").doc(id).get(); return d.exists ? SourceRecordSchema.parse(d.data()) : null; }
  async saveSource(v: SourceRecord) { const x = SourceRecordSchema.parse(v); await this.col("sourceRecords").doc(x.id).set(x); }
  async listSources(limit = 100) { return (await this.col("sourceRecords").orderBy("fetchedAt", "desc").limit(limit).get()).docs.map((d) => SourceRecordSchema.parse(d.data())); }
  async getRun(id: string) { const d = await this.col("processingRuns").doc(id).get(); return d.exists ? ProcessingRunSchema.parse(d.data()) : null; }
  async saveRun(v: ProcessingRun) { const x = ProcessingRunSchema.parse(v); await this.col("processingRuns").doc(x.id).set(x); }
  async listRuns(limit = 100) { return (await this.col("processingRuns").orderBy("startedAt", "desc").limit(limit).get()).docs.map((d) => ProcessingRunSchema.parse(d.data())); }
  async saveAnalysis(v: StoredAnalysis) { const x = StoredAnalysisSchema.parse(v); await this.col("analysisResults").doc(x.id).set(x); }
  async getAnalysis(id: string) { const d = await this.col("analysisResults").doc(id).get(); return d.exists ? StoredAnalysisSchema.parse(d.data()) : null; }
  async listAnalyses(limit = 100) { return (await this.col("analysisResults").orderBy("createdAt", "desc").limit(limit).get()).docs.map((d) => StoredAnalysisSchema.parse(d.data())); }
  async saveReview(v: ReviewDecision) { const x = ReviewDecisionSchema.parse(v); await this.col("reviewDecisions").doc(x.id).set(x); }
  async getReviewForAnalysis(id: string) { const s = await this.col("reviewDecisions").where("analysisResultId", "==", id).limit(1).get(); return s.empty ? null : ReviewDecisionSchema.parse(s.docs[0].data()); }
  async listReviews(limit = 100) { return (await this.col("reviewDecisions").limit(limit).get()).docs.map((d) => ReviewDecisionSchema.parse(d.data())); }
  async saveRadarItem(v: RadarItem) { const x = RadarItemSchema.parse(v); await this.col("radarItems").doc(x.id).set(x); }
  async getRadarItem(id: string) { const d = await this.col("radarItems").doc(id).get(); return d.exists ? RadarItemSchema.parse(d.data()) : null; }
  async findRadarItemByAnalysis(id: string) { const s = await this.col("radarItems").where("analysisResultId", "==", id).limit(1).get(); return s.empty ? null : RadarItemSchema.parse(s.docs[0].data()); }
  async listPublishedItems(limit = 100) { const s = await this.col("radarItems").where("publicationState", "==", "published").limit(limit).get(); return s.docs.map((d) => RadarItemSchema.parse(d.data())).sort((a,b) => b.publishedAt.localeCompare(a.publishedAt)); }
  async saveBusinessProfile(v: BusinessProfile) { const x = BusinessProfileSchema.parse(v); await this.col("businessProfiles").doc(x.id).set(x); }
  async getBusinessProfile(id: string) { const d = await this.col("businessProfiles").doc(id).get(); return d.exists ? BusinessProfileSchema.parse(d.data()) : null; }
  async findBusinessProfileByOwner(ownerId: string) { const s = await this.col("businessProfiles").where("ownerId", "==", ownerId).limit(1).get(); return s.empty ? null : BusinessProfileSchema.parse(s.docs[0].data()); }
  async saveDecisionBrief(v: StoredDecisionBrief) { const x = StoredDecisionBriefSchema.parse(v); await this.col("decisionBriefs").doc(x.id).set(x); }
  async getDecisionBrief(id: string) { const d = await this.col("decisionBriefs").doc(id).get(); return d.exists ? StoredDecisionBriefSchema.parse(d.data()) : null; }
  async listDecisionBriefsByOwner(ownerId: string, limit = 100) { const s = await this.col("decisionBriefs").where("ownerId", "==", ownerId).limit(limit).get(); return s.docs.map((d) => StoredDecisionBriefSchema.parse(d.data())).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  async saveDecisionFeedback(v: DecisionFeedback) { const x = DecisionFeedbackSchema.parse(v); await this.col("decisionFeedback").doc(x.id).set(x); }
  async findDecisionFeedbackByBrief(decisionBriefId: string) { const s = await this.col("decisionFeedback").where("decisionBriefId", "==", decisionBriefId).limit(1).get(); return s.empty ? null : DecisionFeedbackSchema.parse(s.docs[0].data()); }
  async saveDecisionAction(v: DecisionAction) { const x = DecisionActionSchema.parse(v); await this.col("decisionActions").doc(x.id).set(x); }
  async findDecisionActionByBrief(decisionBriefId: string) { const s = await this.col("decisionActions").where("decisionBriefId", "==", decisionBriefId).limit(1).get(); return s.empty ? null : DecisionActionSchema.parse(s.docs[0].data()); }
  async listDecisionActionsByOwner(ownerId: string, limit = 100) { const s = await this.col("decisionActions").where("ownerId", "==", ownerId).limit(limit).get(); return s.docs.map((d) => DecisionActionSchema.parse(d.data())).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async getOperatorCounts() {
    const [pending, needsChanges, approved, rejected, published, failed, completed, sources] = await Promise.all([
      this.col("reviewDecisions").where("status", "==", "pending").count().get(),
      this.col("reviewDecisions").where("status", "==", "needs_changes").count().get(),
      this.col("reviewDecisions").where("status", "==", "approved").count().get(),
      this.col("reviewDecisions").where("status", "==", "rejected").count().get(),
      this.col("radarItems").where("publicationState", "==", "published").count().get(),
      this.col("processingRuns").where("status", "==", "failed").count().get(),
      this.col("processingRuns").where("status", "==", "pending_review").count().get(),
      this.col("sourceRecords").count().get(),
    ]);
    return {
      pendingReviews: pending.data().count + needsChanges.data().count,
      approvedReviews: approved.data().count,
      rejectedReviews: rejected.data().count,
      publishedItems: published.data().count,
      failedRuns: failed.data().count,
      completedRuns: completed.data().count,
      totalSources: sources.data().count,
    };
  }
}
