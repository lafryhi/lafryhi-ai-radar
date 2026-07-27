import { Firestore } from "@google-cloud/firestore";
import { ProcessingRunSchema, RadarItemSchema, ReviewDecisionSchema, RssCandidateSchema, RssDiscoveryRunSchema, SourceDefinitionSchema, SourceRecordSchema, StoredAnalysisSchema, type ProcessingRun, type RadarItem, type ReviewDecision, type RssCandidate, type RssDiscoveryRun, type SourceDefinition, type SourceRecord, type StoredAnalysis } from "@/domain/schemas";
import {
  AnalysisFinalizationIntegrityError,
  ApprovalIntegrityError,
  buildApprovalRecords,
  finalizationRecordsEqual,
  parseAnalysisFinalizationInput,
  type AnalysisFinalizationInput,
  type RadarRepository,
} from "./repository";

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
  async findRadarItemByAnalysis(id: string) { const s = await this.col("radarItems").where("analysisResultId", "==", id).limit(1).get(); return s.empty ? null : RadarItemSchema.parse(s.docs[0].data()); }
  async finalizeAnalysisForReview(value: AnalysisFinalizationInput) {
    const input = parseAnalysisFinalizationInput(value);
    return this.db.runTransaction(async (transaction) => {
      const runRef = this.col("processingRuns").doc(input.processingRun.id);
      const sourceRef = this.col("sourceRecords").doc(input.processingRun.sourceRecordId);
      const analysisRef = this.col("analysisResults").doc(input.analysis.id);
      const reviewRef = this.col("reviewDecisions").doc(input.pendingReview.id);
      const analysisQuery = this.col("analysisResults").where("processingRunId", "==", input.processingRun.id);
      const reviewQuery = this.col("reviewDecisions").where("analysisResultId", "==", input.analysis.id);

      const [runSnapshot, sourceSnapshot, analysisSnapshot, analysisMatches, reviewSnapshot, reviewMatches] = await Promise.all([
        transaction.get(runRef),
        transaction.get(sourceRef),
        transaction.get(analysisRef),
        transaction.get(analysisQuery),
        transaction.get(reviewRef),
        transaction.get(reviewQuery),
      ]);
      if (!runSnapshot.exists) throw new AnalysisFinalizationIntegrityError("Analysis finalization run was not found.");
      if (!sourceSnapshot.exists) throw new AnalysisFinalizationIntegrityError("Analysis finalization source was not found.");
      const currentRun = ProcessingRunSchema.parse(runSnapshot.data());
      const currentSource = SourceRecordSchema.parse(sourceSnapshot.data());
      if (currentRun.id !== input.processingRun.id
        || currentRun.sourceRecordId !== input.processingRun.sourceRecordId
        || currentSource.id !== input.processingRun.sourceRecordId) {
        throw new AnalysisFinalizationIntegrityError("Analysis finalization source/run linkage is invalid.");
      }

      const analysisDocuments = new Map<string, FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>();
      if (analysisSnapshot.exists) analysisDocuments.set(analysisSnapshot.id, analysisSnapshot);
      analysisMatches.docs.forEach((document) => analysisDocuments.set(document.id, document));
      const analyses = [...analysisDocuments.values()].map((document) => StoredAnalysisSchema.parse(document.data()));
      const reviewDocuments = new Map<string, FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>();
      if (reviewSnapshot.exists) reviewDocuments.set(reviewSnapshot.id, reviewSnapshot);
      reviewMatches.docs.forEach((document) => reviewDocuments.set(document.id, document));
      const reviews = [...reviewDocuments.values()].map((document) => ReviewDecisionSchema.parse(document.data()));
      const exactAnalysis = analyses.length === 1 && finalizationRecordsEqual(analyses[0], input.analysis);
      const exactReview = reviews.length === 1 && finalizationRecordsEqual(reviews[0], input.pendingReview);

      if (currentRun.status === "pending_review") {
        if (finalizationRecordsEqual(currentRun, input.processingRun) && exactAnalysis && exactReview) {
          return { ...input, idempotent: true, reconciled: false };
        }
        throw new AnalysisFinalizationIntegrityError("Analysis finalization conflicts with existing completed records.");
      }
      if (currentRun.status !== "processing") {
        throw new AnalysisFinalizationIntegrityError("Analysis finalization run is not processing.");
      }
      const noFinalRecords = analyses.length === 0 && reviews.length === 0;
      const exactPartialPair = exactAnalysis && exactReview;
      if (!noFinalRecords && !exactPartialPair) {
        throw new AnalysisFinalizationIntegrityError("Analysis finalization conflicts with partial records.");
      }
      if (noFinalRecords) {
        transaction.set(analysisRef, input.analysis);
        transaction.set(reviewRef, input.pendingReview);
      }
      transaction.set(runRef, input.processingRun);
      return { ...input, idempotent: false, reconciled: exactPartialPair };
    }, { maxAttempts: 1 });
  }
  async approveReviewAndPublish(analysisId: string, note: string, reviewedAt: string) {
    return this.db.runTransaction(async (transaction) => {
      const analysisRef = this.col("analysisResults").doc(analysisId);
      const analysisSnapshot = await transaction.get(analysisRef);
      if (!analysisSnapshot.exists) throw new ApprovalIntegrityError("Approval integrity error: analysis not found.");
      const analysis = StoredAnalysisSchema.parse(analysisSnapshot.data());

      const sourceRef = this.col("sourceRecords").doc(analysis.sourceRecordId);
      const sourceSnapshot = await transaction.get(sourceRef);
      if (!sourceSnapshot.exists) throw new ApprovalIntegrityError("Approval integrity error: source record not found.");
      const source = SourceRecordSchema.parse(sourceSnapshot.data());

      const reviewQuery = this.col("reviewDecisions").where("analysisResultId", "==", analysisId);
      const reviewSnapshot = await transaction.get(reviewQuery);
      if (reviewSnapshot.size === 0) throw new ApprovalIntegrityError("Approval integrity error: no review exists for this analysis.");
      if (reviewSnapshot.size > 1) throw new ApprovalIntegrityError("Approval integrity error: multiple reviews exist for this analysis.");
      const reviewDocument = reviewSnapshot.docs[0];
      const review = ReviewDecisionSchema.parse(reviewDocument.data());

      const radarQuery = this.col("radarItems").where("analysisResultId", "==", analysisId);
      const radarSnapshot = await transaction.get(radarQuery);
      if (radarSnapshot.size > 1) throw new ApprovalIntegrityError("Approval integrity error: multiple Radar items exist for this analysis.");
      const existingDocument = radarSnapshot.docs[0];
      const existingItem = existingDocument ? RadarItemSchema.parse(existingDocument.data()) : null;
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
      transaction.set(reviewDocument.ref, records.decision);
      transaction.set(this.col("radarItems").doc(records.item.id), records.item);
      return { ...records, idempotent: false };
    });
  }
  async listPublishedItems(limit = 100) { const s = await this.col("radarItems").where("publicationState", "==", "published").limit(limit).get(); return s.docs.map((d) => RadarItemSchema.parse(d.data())).sort((a,b) => b.publishedAt.localeCompare(a.publishedAt)); }
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
