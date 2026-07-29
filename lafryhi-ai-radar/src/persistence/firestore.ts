import { Firestore } from "@google-cloud/firestore";
import { ProcessingRunSchema, RadarItemSchema, ReviewDecisionSchema, RssCandidateSchema, RssDiscoveryRunSchema, SourceDefinitionSchema, SourceRecordSchema, StoredAnalysisSchema, type ProcessingRun, type RadarItem, type ReviewDecision, type RssCandidate, type RssDiscoveryRun, type SourceDefinition, type SourceRecord, type StoredAnalysis } from "@/domain/schemas";
import type { RadarRepository } from "./repository";
import { BusinessProfileSchema, StoredDecisionBriefSchema, type BusinessProfile, type StoredDecisionBrief } from "@/domain/public-mvp";
import { DecisionActionSchema, DecisionFeedbackSchema, type DecisionAction, type DecisionFeedback } from "@/domain/decision-progress";
import { BillingCustomerSchema, BillingWebhookEventSchema, CommercialEventSchema, EntitlementSchema, SubscriptionSchema, UsageCounterSchema, type BillingCustomer, type BillingWebhookEvent, type CommercialEvent, type Entitlement, type Subscription, type UsageCounter } from "@/domain/billing";

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
  async listBusinessProfilesByOwner(ownerId: string, limit = 100) { const s = await this.col("businessProfiles").where("ownerId", "==", ownerId).limit(limit).get(); return s.docs.map((d) => BusinessProfileSchema.parse(d.data())); }
  async listAllBusinessProfiles(limit = 10_000) { const s = await this.col("businessProfiles").limit(limit).get(); return s.docs.map((d) => BusinessProfileSchema.parse(d.data())); }
  async saveDecisionBrief(v: StoredDecisionBrief) { const x = StoredDecisionBriefSchema.parse(v); await this.col("decisionBriefs").doc(x.id).set(x); }
  async getDecisionBrief(id: string) { const d = await this.col("decisionBriefs").doc(id).get(); return d.exists ? StoredDecisionBriefSchema.parse(d.data()) : null; }
  async listDecisionBriefsByOwner(ownerId: string, limit = 100) { const s = await this.col("decisionBriefs").where("ownerId", "==", ownerId).limit(limit).get(); return s.docs.map((d) => StoredDecisionBriefSchema.parse(d.data())).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  async listAllDecisionBriefs(limit = 10_000) { const s = await this.col("decisionBriefs").limit(limit).get(); return s.docs.map((d) => StoredDecisionBriefSchema.parse(d.data())); }
  async saveDecisionFeedback(v: DecisionFeedback) { const x = DecisionFeedbackSchema.parse(v); await this.col("decisionFeedback").doc(x.id).set(x); }
  async findDecisionFeedbackByBrief(decisionBriefId: string) { const s = await this.col("decisionFeedback").where("decisionBriefId", "==", decisionBriefId).limit(1).get(); return s.empty ? null : DecisionFeedbackSchema.parse(s.docs[0].data()); }
  async listDecisionFeedbackByOwner(ownerId: string, limit = 100) { const s = await this.col("decisionFeedback").where("ownerId", "==", ownerId).limit(limit).get(); return s.docs.map((d) => DecisionFeedbackSchema.parse(d.data())); }
  async listAllDecisionFeedback(limit = 10_000) { const s = await this.col("decisionFeedback").limit(limit).get(); return s.docs.map((d) => DecisionFeedbackSchema.parse(d.data())); }
  async saveDecisionAction(v: DecisionAction) { const x = DecisionActionSchema.parse(v); await this.col("decisionActions").doc(x.id).set(x); }
  async findDecisionActionByBrief(decisionBriefId: string) { const s = await this.col("decisionActions").where("decisionBriefId", "==", decisionBriefId).limit(1).get(); return s.empty ? null : DecisionActionSchema.parse(s.docs[0].data()); }
  async listDecisionActionsByOwner(ownerId: string, limit = 100) { const s = await this.col("decisionActions").where("ownerId", "==", ownerId).limit(limit).get(); return s.docs.map((d) => DecisionActionSchema.parse(d.data())).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async listAllDecisionActions(limit = 10_000) { const s = await this.col("decisionActions").limit(limit).get(); return s.docs.map((d) => DecisionActionSchema.parse(d.data())); }
  async saveBillingCustomer(v: BillingCustomer) { const x = BillingCustomerSchema.parse(v); await this.col("billingCustomers").doc(x.id).set(x); }
  async getBillingCustomer(id: string) { const d = await this.col("billingCustomers").doc(id).get(); return d.exists ? BillingCustomerSchema.parse(d.data()) : null; }
  async findBillingCustomerByOwner(ownerId: string) { const s = await this.col("billingCustomers").where("ownerId","==",ownerId).limit(1).get(); return s.empty ? null : BillingCustomerSchema.parse(s.docs[0].data()); }
  async listAllBillingCustomers(limit = 10_000) { return (await this.col("billingCustomers").limit(limit).get()).docs.map((d)=>BillingCustomerSchema.parse(d.data())); }
  async saveSubscription(v: Subscription) { const x = SubscriptionSchema.parse(v); await this.col("subscriptions").doc(x.id).set(x); }
  async getSubscriptionByPaddleId(id: string) { const s = await this.col("subscriptions").where("paddleSubscriptionId","==",id).limit(1).get(); return s.empty ? null : SubscriptionSchema.parse(s.docs[0].data()); }
  async findSubscriptionByOwner(ownerId: string) { const s = await this.col("subscriptions").where("ownerId","==",ownerId).limit(20).get(); return s.docs.map((d)=>SubscriptionSchema.parse(d.data())).sort((a,b)=>b.providerUpdatedAt.localeCompare(a.providerUpdatedAt))[0] ?? null; }
  async listAllSubscriptions(limit = 10_000) { return (await this.col("subscriptions").limit(limit).get()).docs.map((d)=>SubscriptionSchema.parse(d.data())); }
  async saveEntitlement(v: Entitlement) { const x = EntitlementSchema.parse(v); await this.col("entitlements").doc(x.ownerId).set(x); }
  async getEntitlement(ownerId: string) { const d = await this.col("entitlements").doc(ownerId).get(); return d.exists ? EntitlementSchema.parse(d.data()) : null; }
  async saveUsageCounter(v: UsageCounter) { const x = UsageCounterSchema.parse(v); await this.col("usageCounters").doc(x.id).set(x); }
  async getUsageCounter(ownerId: string, periodKey: string) { const d = await this.col("usageCounters").doc(`${ownerId}_${periodKey}`).get(); return d.exists ? UsageCounterSchema.parse(d.data()) : null; }
  async listAllUsageCounters(limit = 10_000) { return (await this.col("usageCounters").limit(limit).get()).docs.map((d)=>UsageCounterSchema.parse(d.data())); }
  async saveBillingWebhookEvent(v: BillingWebhookEvent) { const x = BillingWebhookEventSchema.parse(v); await this.col("billingWebhookEvents").doc(x.id).set(x); }
  async getBillingWebhookEvent(id: string) { const d = await this.col("billingWebhookEvents").doc(id).get(); return d.exists ? BillingWebhookEventSchema.parse(d.data()) : null; }
  async listAllBillingWebhookEvents(limit = 10_000) { return (await this.col("billingWebhookEvents").limit(limit).get()).docs.map((d)=>BillingWebhookEventSchema.parse(d.data())); }
  async saveCommercialEvent(v: CommercialEvent) { const x = CommercialEventSchema.parse(v); await this.col("commercialEvents").doc(x.id).set(x); }
  async listAllCommercialEvents(limit = 10_000) { return (await this.col("commercialEvents").limit(limit).get()).docs.map((d)=>CommercialEventSchema.parse(d.data())); }
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
