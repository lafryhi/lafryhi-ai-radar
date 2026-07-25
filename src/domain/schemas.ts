import { z } from "zod";

export const isoDateTime = z.string().datetime({ offset: true });

export const SourceRecordSchema = z.object({
  id: z.string().min(1),
  sourceDefinitionId: z.string().min(1).optional(),
  sourceUrl: z.string().url(),
  sourceName: z.string().min(1),
  title: z.string().min(1),
  publishedAt: isoDateTime,
  fetchedAt: isoDateTime,
  normalizedText: z.string().min(200).max(100_000),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  sourceType: z.enum(["official_announcement"]),
});

export const SourceTrustLevelSchema = z.enum(["official", "verified", "community", "experimental", "blocked"]);
export const SourceStatusSchema = z.enum(["enabled", "disabled", "blocked", "archived"]);
export const SourceCategorySchema = z.enum(["ai_platform", "model_provider", "research_lab", "developer_platform", "business_program", "public_policy", "other"]);

export const SourceDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(2).max(120),
  publisher: z.string().trim().min(2).max(120),
  canonicalDomain: z.string().trim().toLowerCase().regex(/^(?=.{3,253}$)(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/),
  homepage: z.string().url().refine((value) => new URL(value).protocol === "https:", "Homepage must use HTTPS."),
  rssUrl: z.string().url().refine((value) => new URL(value).protocol === "https:", "RSS URL must use HTTPS.").nullable(),
  documentationUrl: z.string().url().refine((value) => new URL(value).protocol === "https:", "Documentation URL must use HTTPS.").nullable(),
  category: SourceCategorySchema,
  language: z.string().trim().toLowerCase().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  trustLevel: SourceTrustLevelSchema,
  status: SourceStatusSchema,
  requiresHumanReview: z.literal(true),
  notes: z.string().trim().max(2000),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
}).superRefine((value, context) => {
  if ((value.status === "blocked") !== (value.trustLevel === "blocked")) {
    context.addIssue({ code: "custom", message: "Blocked status and trust level must be set together." });
  }
});

export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
}).optional();

export const ProcessingRunSchema = z.object({
  id: z.string().min(1),
  sourceRecordId: z.string().min(1),
  status: z.enum(["ingesting", "processing", "pending_review", "failed"]),
  model: z.string().min(1),
  modelProvider: z.literal("vertex-ai"),
  startedAt: isoDateTime,
  completedAt: isoDateTime.nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  promptVersion: z.string().min(1),
  tokenUsage: TokenUsageSchema,
  estimatedCostUsd: z.number().nonnegative().nullable(),
  validationOutcome: z.enum(["not_run", "passed", "failed"]),
  errorDetails: z.string().max(2000).nullable(),
  retryCount: z.number().int().nonnegative(),
});

export const EvidenceSchema = z.object({
  quote: z.string().min(1).max(500),
  significance: z.string().min(1).max(500),
}).strict();

export const OpportunitySchema = z.object({
  isOpportunity: z.boolean(),
  deadline: isoDateTime.nullable(),
  eligibility: z.string().max(1000).nullable(),
  benefit: z.string().max(1000).nullable(),
  effortEstimate: z.enum(["low", "medium", "high"]).nullable(),
}).superRefine((value, context) => {
  if (!value.isOpportunity && [value.deadline, value.eligibility, value.benefit, value.effortEstimate].some(Boolean)) {
    context.addIssue({ code: "custom", message: "Non-opportunities cannot contain opportunity details" });
  }
});

export const AnalysisCategorySchema = z.enum(["model_release", "product_launch", "platform_update", "developer_announcement", "grant", "hackathon", "business_opportunity", "policy", "ecosystem_change"]);
export const OverallRecommendationSchema = z.enum(["Publish", "Needs Human Attention", "Archive", "Reject"]);
export const EntityTypeSchema = z.enum(["company", "product", "model", "technology", "programming_language", "cloud_platform", "standard", "research_paper", "api", "framework"]);
const DecisionScoreSchema = z.number().int().min(0).max(100);
const shortList = (maximum: number) => z.array(z.string().trim().min(1).max(160)).max(maximum);

export const ExtractedEntitySchema = z.object({
  name: z.string().trim().min(1).max(160),
  normalizedName: z.string().trim().min(1).max(160),
  type: EntityTypeSchema,
}).strict();

export const RelatedPreviousArticleSchema = z.object({
  sourceRecordId: z.string().min(1),
  title: z.string().min(1).max(300),
  sourceUrl: z.string().url(),
  relation: z.enum(["duplicate", "near_duplicate", "same_topic", "already_covered"]),
  reason: z.string().min(10).max(500),
}).strict();

export const DuplicateAnalysisSchema = z.object({
  similarityScore: DecisionScoreSchema,
  classification: z.enum(["unique", "duplicate", "near_duplicate", "same_topic", "already_covered"]),
  relatedPreviousArticles: z.array(RelatedPreviousArticleSchema).max(5),
  duplicateReason: z.string().min(10).max(800).nullable(),
}).strict().superRefine((value, context) => {
  if (value.classification !== "unique" && value.relatedPreviousArticles.length === 0) {
    context.addIssue({ code: "custom", message: "Non-unique analysis requires a related previous article." });
  }
  if (value.classification !== "unique" && !value.duplicateReason) {
    context.addIssue({ code: "custom", message: "Non-unique analysis requires a duplicate reason." });
  }
});

export const GeminiAnalysisOutputSchema = z.object({
  summary: z.string().min(20).max(800),
  keyPoints: shortList(8).min(1),
  whyItMatters: z.string().min(20).max(1000),
  category: AnalysisCategorySchema,
  importanceScore: DecisionScoreSchema,
  noveltyScore: DecisionScoreSchema,
  confidenceScore: DecisionScoreSchema,
  timelinessScore: DecisionScoreSchema,
  educationalValueScore: DecisionScoreSchema,
  developerImpactScore: DecisionScoreSchema,
  enterpriseImpactScore: DecisionScoreSchema,
  researchImpactScore: DecisionScoreSchema,
  overallRecommendation: OverallRecommendationSchema,
  recommendedAction: z.string().min(10).max(800),
  reasoning: z.string().min(20).max(1200),
  targetAudience: shortList(8).min(1),
  relatedTopics: shortList(12),
  mentionedCompanies: shortList(12),
  mentionedProducts: shortList(12),
  mentionedTechnologies: shortList(12),
  entities: z.array(ExtractedEntitySchema).max(30),
  potentialRisks: shortList(10),
  followUpRecommended: z.boolean(),
  breakingNews: z.boolean(),
  estimatedReadingTime: z.number().int().min(1).max(60),
  evidence: z.array(EvidenceSchema).min(1).max(5),
  warnings: z.array(z.string().min(1).max(500)).max(10),
  opportunity: OpportunitySchema,
  duplicateAnalysis: DuplicateAnalysisSchema,
}).strict();

export const AnalysisResultSchema = GeminiAnalysisOutputSchema.extend({
  relevanceScore: DecisionScoreSchema,
}).strict();

const LegacyAnalysisResultSchema = z.object({
  summary: z.string().min(20).max(800),
  whyItMatters: z.string().min(20).max(1000),
  category: AnalysisCategorySchema,
  relevanceScore: DecisionScoreSchema,
  confidenceScore: DecisionScoreSchema,
  recommendedAction: z.string().min(10).max(800),
  evidence: z.array(EvidenceSchema).min(1).max(5),
  warnings: z.array(z.string().min(1).max(500)).max(10),
  opportunity: OpportunitySchema,
}).strict();

const StoredAnalysisIdentitySchema = z.object({
  id: z.string().min(1),
  sourceRecordId: z.string().min(1),
  processingRunId: z.string().min(1),
  createdAt: isoDateTime,
}).strict();

const DecisionStoredAnalysisSchema = AnalysisResultSchema.extend(StoredAnalysisIdentitySchema.shape).strict();
const LegacyStoredAnalysisSchema = LegacyAnalysisResultSchema.extend(StoredAnalysisIdentitySchema.shape).strict();

export const StoredAnalysisSchema = z.union([DecisionStoredAnalysisSchema, LegacyStoredAnalysisSchema])
  .transform((value) => {
    if ("importanceScore" in value) return value;
    return {
      ...value,
      // Legacy summaries were allowed to exceed the new per-key-point bound.
      // Adapt them in memory without rewriting the production document.
      keyPoints: [value.summary.slice(0, 160)],
      importanceScore: value.relevanceScore,
      noveltyScore: 50,
      timelinessScore: 50,
      educationalValueScore: 50,
      developerImpactScore: value.relevanceScore,
      enterpriseImpactScore: 50,
      researchImpactScore: 50,
      overallRecommendation: "Needs Human Attention" as const,
      reasoning: value.whyItMatters,
      targetAudience: ["Human operator"],
      relatedTopics: [value.category.replaceAll("_", " ")],
      mentionedCompanies: [],
      mentionedProducts: [],
      mentionedTechnologies: [],
      entities: [],
      potentialRisks: value.warnings,
      followUpRecommended: true,
      breakingNews: false,
      estimatedReadingTime: 1,
      duplicateAnalysis: {
        similarityScore: 0,
        classification: "unique" as const,
        relatedPreviousArticles: [],
        duplicateReason: null,
      },
    };
  })
  .pipe(DecisionStoredAnalysisSchema);

export const ReviewDecisionSchema = z.object({
  id: z.string().min(1),
  analysisResultId: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected", "needs_changes"]),
  reviewerNote: z.string().max(2000),
  reviewedAt: isoDateTime.nullable(),
});

export const RadarItemSchema = z.object({
  id: z.string().min(1),
  publicTitle: z.string().min(1).max(300),
  publicSummary: z.string().min(20).max(800),
  whyItMatters: z.string().min(20).max(1000),
  recommendedAction: z.string().min(10).max(800),
  category: AnalysisResultSchema.shape.category,
  relevanceScore: z.number().int().min(0).max(100),
  confidenceScore: z.number().int().min(0).max(100),
  originalSourceUrl: z.string().url(),
  sourceName: z.string().min(1),
  sourcePublishedAt: isoDateTime,
  publicationState: z.literal("published"),
  sourceRecordId: z.string().min(1),
  processingRunId: z.string().min(1),
  analysisResultId: z.string().min(1),
  reviewDecisionId: z.string().min(1),
  publishedAt: isoDateTime,
});

export const RssCandidateSchema = z.object({
  id: z.string().min(1),
  sourceDefinitionId: z.string().min(1),
  discoveryRunId: z.string().min(1),
  title: z.string().min(1).max(300),
  articleUrl: z.string().url(),
  normalizedUrl: z.string().url(),
  publishedAt: isoDateTime.nullable(),
  feedItemIdHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  summary: z.string().max(500).nullable(),
  publisher: z.string().min(1).max(120),
  discoveredAt: isoDateTime,
  status: z.enum(["pending", "processed"]),
  sourceRecordId: z.string().min(1).nullable(),
  processedAt: isoDateTime.nullable(),
});

export const RssDiscoveryRunSchema = z.object({
  id: z.string().min(1),
  trigger: z.enum(["manual", "scheduled"]),
  sourceDefinitionId: z.string().min(1).nullable(),
  startedAt: isoDateTime,
  completedAt: isoDateTime.nullable(),
  status: z.enum(["running", "success", "partial", "failed", "skipped"]),
  sourcesConsidered: z.number().int().min(0).max(10),
  feedsSucceeded: z.number().int().min(0).max(10),
  feedsFailed: z.number().int().min(0).max(10),
  itemsExamined: z.number().int().min(0).max(500),
  candidatesAccepted: z.number().int().min(0).max(25),
  duplicates: z.number().int().min(0).max(500),
  skippedItems: z.number().int().min(0).max(500),
  validationFailures: z.number().int().min(0).max(500),
  errorCategories: z.array(z.enum(["ineligible_source", "missing_feed", "unsafe_url", "fetch_failed", "unsupported_content", "oversized_feed", "malformed_feed", "persistence_failed"])).max(10),
});

export type SourceRecord = z.infer<typeof SourceRecordSchema>;
export type SourceDefinition = z.infer<typeof SourceDefinitionSchema>;
export type SourceTrustLevel = z.infer<typeof SourceTrustLevelSchema>;
export type SourceStatus = z.infer<typeof SourceStatusSchema>;
export type ProcessingRun = z.infer<typeof ProcessingRunSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type StoredAnalysis = z.infer<typeof StoredAnalysisSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type RadarItem = z.infer<typeof RadarItemSchema>;
export type RssCandidate = z.infer<typeof RssCandidateSchema>;
export type RssDiscoveryRun = z.infer<typeof RssDiscoveryRunSchema>;
