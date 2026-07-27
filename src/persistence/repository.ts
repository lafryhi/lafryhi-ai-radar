import { ProcessingRunSchema, RadarItemSchema, ReviewDecisionSchema, StoredAnalysisSchema, type ProcessingRun, type RadarItem, type ReviewDecision, type RssCandidate, type RssDiscoveryRun, type SourceDefinition, type SourceRecord, type StoredAnalysis } from "@/domain/schemas";

export class ApprovalIntegrityError extends Error {}
export class AnalysisFinalizationIntegrityError extends Error {}

export interface AnalysisFinalizationInput {
  processingRun: ProcessingRun;
  analysis: StoredAnalysis;
  pendingReview: ReviewDecision;
}

export interface AnalysisFinalizationResult extends AnalysisFinalizationInput {
  idempotent: boolean;
  reconciled: boolean;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export function finalizationRecordsEqual(left: unknown, right: unknown) {
  return canonical(left) === canonical(right);
}

export function parseAnalysisFinalizationInput(input: AnalysisFinalizationInput): AnalysisFinalizationInput {
  const processingRun = ProcessingRunSchema.parse(input.processingRun);
  const analysis = StoredAnalysisSchema.parse(input.analysis);
  const pendingReview = ReviewDecisionSchema.parse(input.pendingReview);
  const expectedAnalysisId = `analysis-${processingRun.id}`;
  const expectedReviewId = `review-${expectedAnalysisId}`;
  if (processingRun.status !== "pending_review"
    || processingRun.validationOutcome !== "passed"
    || !processingRun.completedAt
    || processingRun.errorDetails !== null
    || processingRun.model === "pending") {
    throw new AnalysisFinalizationIntegrityError("Analysis finalization requires a completed pending-review run.");
  }
  if (analysis.id !== expectedAnalysisId
    || analysis.processingRunId !== processingRun.id
    || analysis.sourceRecordId !== processingRun.sourceRecordId) {
    throw new AnalysisFinalizationIntegrityError("Analysis finalization linkage is invalid.");
  }
  if (pendingReview.id !== expectedReviewId
    || pendingReview.analysisResultId !== analysis.id
    || pendingReview.status !== "pending"
    || pendingReview.reviewerNote !== ""
    || pendingReview.reviewedAt !== null) {
    throw new AnalysisFinalizationIntegrityError("Pending review finalization linkage is invalid.");
  }
  return { processingRun, analysis, pendingReview };
}

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
  finalizeAnalysisForReview(value: AnalysisFinalizationInput): Promise<AnalysisFinalizationResult>;
  findRadarItemByAnalysis(id: string): Promise<RadarItem | null>;
  approveReviewAndPublish(analysisId: string, note: string, reviewedAt: string): Promise<AtomicApprovalResult>;
  listPublishedItems(limit?: number): Promise<RadarItem[]>;
  getOperatorCounts(): Promise<OperatorCounts>;
}
