import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { ProcessingRunSchema, RadarItemSchema, ReviewDecisionSchema, RssCandidateSchema, RssDiscoveryRunSchema, SourceDefinitionSchema, SourceRecordSchema, StoredAnalysisSchema } from "@/domain/schemas";
import { MemoryRepository } from "./memory";
import { BusinessProfileSchema, StoredDecisionBriefSchema } from "@/domain/public-mvp";
import { DecisionActionSchema, DecisionFeedbackSchema } from "@/domain/decision-progress";
import { BillingCustomerSchema, BillingWebhookEventSchema, CommercialEventSchema, EntitlementSchema, SubscriptionSchema, UsageCounterSchema } from "@/domain/billing";

const LocalDataSchema = z.object({
  sourceDefinitions: z.array(SourceDefinitionSchema).default([]),
  rssCandidates: z.array(RssCandidateSchema).default([]),
  rssDiscoveryRuns: z.array(RssDiscoveryRunSchema).default([]),
  sources: z.array(SourceRecordSchema),
  runs: z.array(ProcessingRunSchema),
  analyses: z.array(StoredAnalysisSchema),
  reviews: z.array(ReviewDecisionSchema),
  items: z.array(RadarItemSchema),
  businessProfiles: z.array(BusinessProfileSchema).default([]),
  decisionBriefs: z.array(StoredDecisionBriefSchema).default([]),
  decisionFeedback: z.array(DecisionFeedbackSchema).default([]),
  decisionActions: z.array(DecisionActionSchema).default([]),
  billingCustomers: z.array(BillingCustomerSchema).default([]),
  subscriptions: z.array(SubscriptionSchema).default([]),
  entitlements: z.array(EntitlementSchema).default([]),
  usageCounters: z.array(UsageCounterSchema).default([]),
  billingWebhookEvents: z.array(BillingWebhookEventSchema).default([]),
  commercialEvents: z.array(CommercialEventSchema).default([]),
});

export class LocalFileRepository extends MemoryRepository {
  private loaded = false;
  constructor(private readonly path: string) { super(); }

  private async load() {
    if (this.loaded) return;
    try {
      const data = LocalDataSchema.parse(JSON.parse(await readFile(this.path, "utf8")));
      data.sourceDefinitions.forEach((x) => this.sourceDefinitions.set(x.id, x));
      data.rssCandidates.forEach((x) => this.rssCandidates.set(x.id, x));
      data.rssDiscoveryRuns.forEach((x) => this.rssDiscoveryRuns.set(x.id, x));
      data.sources.forEach((x) => this.sources.set(x.id, x));
      data.runs.forEach((x) => this.runs.set(x.id, x));
      data.analyses.forEach((x) => this.analyses.set(x.id, x));
      data.reviews.forEach((x) => this.reviews.set(x.id, x));
      data.items.forEach((x) => this.items.set(x.id, x));
      data.businessProfiles.forEach((x) => this.businessProfiles.set(x.id, x));
      data.decisionBriefs.forEach((x) => this.decisionBriefs.set(x.id, x));
      data.decisionFeedback.forEach((x) => this.decisionFeedback.set(x.id, x));
      data.decisionActions.forEach((x) => this.decisionActions.set(x.id, x));
      data.billingCustomers.forEach((x) => this.billingCustomers.set(x.id, x));
      data.subscriptions.forEach((x) => this.subscriptions.set(x.id, x));
      data.entitlements.forEach((x) => this.entitlements.set(x.ownerId, x));
      data.usageCounters.forEach((x) => this.usageCounters.set(x.id, x));
      data.billingWebhookEvents.forEach((x) => this.billingWebhookEvents.set(x.id, x));
      data.commercialEvents.forEach((x) => this.commercialEvents.set(x.id, x));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    this.loaded = true;
  }

  private async flush() {
    await mkdir(dirname(this.path), { recursive: true });
    const temp = `${this.path}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify({
      sourceDefinitions: [...this.sourceDefinitions.values()],
      rssCandidates: [...this.rssCandidates.values()],
      rssDiscoveryRuns: [...this.rssDiscoveryRuns.values()],
      sources: [...this.sources.values()], runs: [...this.runs.values()],
      analyses: [...this.analyses.values()], reviews: [...this.reviews.values()],
      items: [...this.items.values()],
      businessProfiles: [...this.businessProfiles.values()],
      decisionBriefs: [...this.decisionBriefs.values()],
      decisionFeedback: [...this.decisionFeedback.values()],
      decisionActions: [...this.decisionActions.values()],
      billingCustomers: [...this.billingCustomers.values()],
      subscriptions: [...this.subscriptions.values()],
      entitlements: [...this.entitlements.values()],
      usageCounters: [...this.usageCounters.values()],
      billingWebhookEvents: [...this.billingWebhookEvents.values()],
      commercialEvents: [...this.commercialEvents.values()],
    }, null, 2));
    await rename(temp, this.path);
  }

  override async getSourceDefinition(id: string) { await this.load(); return super.getSourceDefinition(id); }
  override async findSourceDefinitionByDomain(domain: string) { await this.load(); return super.findSourceDefinitionByDomain(domain); }
  override async saveSourceDefinition(v: Parameters<MemoryRepository["saveSourceDefinition"]>[0]) { await this.load(); await super.saveSourceDefinition(v); await this.flush(); }
  override async listSourceDefinitions(limit?: number) { await this.load(); return super.listSourceDefinitions(limit); }
  override async countSourceDefinitions() { await this.load(); return super.countSourceDefinitions(); }
  override async getRssCandidate(id: string) { await this.load(); return super.getRssCandidate(id); }
  override async findRssCandidateByUrl(normalizedUrl: string) { await this.load(); return super.findRssCandidateByUrl(normalizedUrl); }
  override async findRssCandidateByFeedId(sourceDefinitionId: string, feedItemIdHash: string) { await this.load(); return super.findRssCandidateByFeedId(sourceDefinitionId, feedItemIdHash); }
  override async saveRssCandidate(v: Parameters<MemoryRepository["saveRssCandidate"]>[0]) { await this.load(); await super.saveRssCandidate(v); await this.flush(); }
  override async listRssCandidates(sourceDefinitionId: string, limit?: number) { await this.load(); return super.listRssCandidates(sourceDefinitionId, limit); }
  override async saveRssDiscoveryRun(v: Parameters<MemoryRepository["saveRssDiscoveryRun"]>[0]) { await this.load(); await super.saveRssDiscoveryRun(v); await this.flush(); }
  override async listRssDiscoveryRuns(sourceDefinitionId?: string, limit?: number) { await this.load(); return super.listRssDiscoveryRuns(sourceDefinitionId, limit); }
  override async findSourceByUrl(normalizedUrl: string) { await this.load(); return super.findSourceByUrl(normalizedUrl); }
  override async findSourceByHash(hash: string) { await this.load(); return super.findSourceByHash(hash); }
  override async getSource(id: string) { await this.load(); return super.getSource(id); }
  override async saveSource(v: Parameters<MemoryRepository["saveSource"]>[0]) { await this.load(); await super.saveSource(v); await this.flush(); }
  override async listSources(limit?: number) { await this.load(); return super.listSources(limit); }
  override async getRun(id: string) { await this.load(); return super.getRun(id); }
  override async saveRun(v: Parameters<MemoryRepository["saveRun"]>[0]) { await this.load(); await super.saveRun(v); await this.flush(); }
  override async listRuns(limit?: number) { await this.load(); return super.listRuns(limit); }
  override async saveAnalysis(v: Parameters<MemoryRepository["saveAnalysis"]>[0]) { await this.load(); await super.saveAnalysis(v); await this.flush(); }
  override async getAnalysis(id: string) { await this.load(); return super.getAnalysis(id); }
  override async listAnalyses(limit?: number) { await this.load(); return super.listAnalyses(limit); }
  override async saveReview(v: Parameters<MemoryRepository["saveReview"]>[0]) { await this.load(); await super.saveReview(v); await this.flush(); }
  override async getReviewForAnalysis(id: string) { await this.load(); return super.getReviewForAnalysis(id); }
  override async listReviews(limit?: number) { await this.load(); return super.listReviews(limit); }
  override async saveRadarItem(v: Parameters<MemoryRepository["saveRadarItem"]>[0]) { await this.load(); await super.saveRadarItem(v); await this.flush(); }
  override async getRadarItem(id: string) { await this.load(); return super.getRadarItem(id); }
  override async findRadarItemByAnalysis(id: string) { await this.load(); return super.findRadarItemByAnalysis(id); }
  override async listPublishedItems(limit?: number) { await this.load(); return super.listPublishedItems(limit); }
  override async saveBusinessProfile(v: Parameters<MemoryRepository["saveBusinessProfile"]>[0]) { await this.load(); await super.saveBusinessProfile(v); await this.flush(); }
  override async getBusinessProfile(id: string) { await this.load(); return super.getBusinessProfile(id); }
  override async findBusinessProfileByOwner(ownerId: string) { await this.load(); return super.findBusinessProfileByOwner(ownerId); }
  override async listBusinessProfilesByOwner(ownerId: string, limit?: number) { await this.load(); return super.listBusinessProfilesByOwner(ownerId, limit); }
  override async listAllBusinessProfiles(limit?: number) { await this.load(); return super.listAllBusinessProfiles(limit); }
  override async saveDecisionBrief(v: Parameters<MemoryRepository["saveDecisionBrief"]>[0]) { await this.load(); await super.saveDecisionBrief(v); await this.flush(); }
  override async getDecisionBrief(id: string) { await this.load(); return super.getDecisionBrief(id); }
  override async listDecisionBriefsByOwner(ownerId: string, limit?: number) { await this.load(); return super.listDecisionBriefsByOwner(ownerId, limit); }
  override async listAllDecisionBriefs(limit?: number) { await this.load(); return super.listAllDecisionBriefs(limit); }
  override async saveDecisionFeedback(v: Parameters<MemoryRepository["saveDecisionFeedback"]>[0]) { await this.load(); await super.saveDecisionFeedback(v); await this.flush(); }
  override async findDecisionFeedbackByBrief(decisionBriefId: string) { await this.load(); return super.findDecisionFeedbackByBrief(decisionBriefId); }
  override async listDecisionFeedbackByOwner(ownerId: string, limit?: number) { await this.load(); return super.listDecisionFeedbackByOwner(ownerId, limit); }
  override async listAllDecisionFeedback(limit?: number) { await this.load(); return super.listAllDecisionFeedback(limit); }
  override async saveDecisionAction(v: Parameters<MemoryRepository["saveDecisionAction"]>[0]) { await this.load(); await super.saveDecisionAction(v); await this.flush(); }
  override async findDecisionActionByBrief(decisionBriefId: string) { await this.load(); return super.findDecisionActionByBrief(decisionBriefId); }
  override async listDecisionActionsByOwner(ownerId: string, limit?: number) { await this.load(); return super.listDecisionActionsByOwner(ownerId, limit); }
  override async listAllDecisionActions(limit?: number) { await this.load(); return super.listAllDecisionActions(limit); }
  override async saveBillingCustomer(v: Parameters<MemoryRepository["saveBillingCustomer"]>[0]) { await this.load(); await super.saveBillingCustomer(v); await this.flush(); }
  override async getBillingCustomer(id: string) { await this.load(); return super.getBillingCustomer(id); }
  override async findBillingCustomerByOwner(ownerId: string) { await this.load(); return super.findBillingCustomerByOwner(ownerId); }
  override async listAllBillingCustomers(limit?: number) { await this.load(); return super.listAllBillingCustomers(limit); }
  override async saveSubscription(v: Parameters<MemoryRepository["saveSubscription"]>[0]) { await this.load(); await super.saveSubscription(v); await this.flush(); }
  override async getSubscriptionByPaddleId(id: string) { await this.load(); return super.getSubscriptionByPaddleId(id); }
  override async findSubscriptionByOwner(ownerId: string) { await this.load(); return super.findSubscriptionByOwner(ownerId); }
  override async listAllSubscriptions(limit?: number) { await this.load(); return super.listAllSubscriptions(limit); }
  override async saveEntitlement(v: Parameters<MemoryRepository["saveEntitlement"]>[0]) { await this.load(); await super.saveEntitlement(v); await this.flush(); }
  override async getEntitlement(ownerId: string) { await this.load(); return super.getEntitlement(ownerId); }
  override async saveUsageCounter(v: Parameters<MemoryRepository["saveUsageCounter"]>[0]) { await this.load(); await super.saveUsageCounter(v); await this.flush(); }
  override async getUsageCounter(ownerId: string, periodKey: string) { await this.load(); return super.getUsageCounter(ownerId, periodKey); }
  override async listAllUsageCounters(limit?: number) { await this.load(); return super.listAllUsageCounters(limit); }
  override async saveBillingWebhookEvent(v: Parameters<MemoryRepository["saveBillingWebhookEvent"]>[0]) { await this.load(); await super.saveBillingWebhookEvent(v); await this.flush(); }
  override async getBillingWebhookEvent(id: string) { await this.load(); return super.getBillingWebhookEvent(id); }
  override async listAllBillingWebhookEvents(limit?: number) { await this.load(); return super.listAllBillingWebhookEvents(limit); }
  override async saveCommercialEvent(v: Parameters<MemoryRepository["saveCommercialEvent"]>[0]) { await this.load(); await super.saveCommercialEvent(v); await this.flush(); }
  override async listAllCommercialEvents(limit?: number) { await this.load(); return super.listAllCommercialEvents(limit); }
  override async getOperatorCounts() { await this.load(); return super.getOperatorCounts(); }
}
