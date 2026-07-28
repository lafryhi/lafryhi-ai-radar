import { z } from "zod";
import { IntelligenceItemSchema } from "@/domain/mission-control";
import { SourceDefinitionSchema, SourceTrustLevelSchema, isoDateTime } from "@/domain/schemas";

export const RANKING_FACTORS = [
  "impact",
  "relevance",
  "confidence",
  "timeliness",
  "evidenceSufficiency",
  "sourceAuthority",
] as const;

export const WEIGHT_SUM_TOLERANCE = 1e-9;

export const Score100Schema = z.number().finite().min(0).max(100);
export const NormalizedScoreSchema = z.number().finite().min(0).max(1);
export const RankingFactorSchema = z.enum(RANKING_FACTORS);
export const SignalAvailabilitySchema = z.enum(["available", "unknown", "invalid"]);

export const RankingSignalSchema = z.object({
  factor: RankingFactorSchema,
  rawValue: z.union([z.number().finite(), z.string(), z.null()]),
  normalizedValue: NormalizedScoreSchema.nullable(),
  availability: SignalAvailabilitySchema,
  weight: NormalizedScoreSchema,
  effectiveWeight: NormalizedScoreSchema,
  contribution: NormalizedScoreSchema,
  normalizationVersion: z.string().min(1).max(80),
  explanationCodes: z.array(z.string().min(1).max(80)).max(20),
}).strict().superRefine((value, context) => {
  if (value.availability === "available" && value.normalizedValue === null) {
    context.addIssue({ code: "custom", path: ["normalizedValue"], message: "Available signals require a normalized value." });
  }
  if (value.availability !== "available" && value.normalizedValue !== null) {
    context.addIssue({ code: "custom", path: ["normalizedValue"], message: "Unavailable signals cannot have a normalized value." });
  }
});

export const ConfidenceCapSchema = z.object({
  below: NormalizedScoreSchema.refine((value) => value > 0, "Confidence cap boundaries must be greater than zero."),
  maximumFinalScore: Score100Schema,
}).strict();

const RankingWeightsSchema = z.object({
  impact: NormalizedScoreSchema,
  relevance: NormalizedScoreSchema,
  confidence: NormalizedScoreSchema,
  timeliness: NormalizedScoreSchema,
  evidenceSufficiency: NormalizedScoreSchema,
  sourceAuthority: NormalizedScoreSchema,
}).strict().superRefine((weights, context) => {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(total - 1) > WEIGHT_SUM_TOLERANCE) {
    context.addIssue({ code: "custom", message: `Ranking policy weights must sum to 1 within ${WEIGHT_SUM_TOLERANCE}.` });
  }
});

const RankBandThresholdsSchema = z.object({
  critical: Score100Schema,
  high: Score100Schema,
  medium: Score100Schema,
  low: Score100Schema,
}).strict().superRefine((thresholds, context) => {
  if (!(thresholds.critical > thresholds.high && thresholds.high > thresholds.medium && thresholds.medium > thresholds.low)) {
    context.addIssue({ code: "custom", message: "Rank-band thresholds must be strictly descending." });
  }
});

const SourceAuthoritySchema = z.object({
  official: NormalizedScoreSchema,
  verified: NormalizedScoreSchema,
  community: NormalizedScoreSchema,
  experimental: NormalizedScoreSchema,
  blocked: z.null(),
}).strict();

export const RankingPolicySchema = z.object({
  version: z.string().min(1).max(80),
  algorithmVersion: z.string().min(1).max(80),
  supportedAnalysisPromptVersions: z.array(z.string().min(1).max(80)).min(1).max(20)
    .refine((values) => new Set(values).size === values.length, "Supported prompt versions must be unique."),
  weights: RankingWeightsSchema,
  rankBandThresholds: RankBandThresholdsSchema,
  sourceAuthority: SourceAuthoritySchema,
  confidenceCaps: z.array(ConfidenceCapSchema).max(10),
}).strict().superRefine((policy, context) => {
  for (let index = 1; index < policy.confidenceCaps.length; index += 1) {
    const previous = policy.confidenceCaps[index - 1];
    const current = policy.confidenceCaps[index];
    if (current.below <= previous.below) {
      context.addIssue({ code: "custom", path: ["confidenceCaps", index, "below"], message: "Confidence cap boundaries must be strictly ascending." });
    }
    if (current.maximumFinalScore < previous.maximumFinalScore) {
      context.addIssue({ code: "custom", path: ["confidenceCaps", index, "maximumFinalScore"], message: "Confidence cap maximum scores must be nondecreasing." });
    }
  }
});

export const RankingInputSchema = z.object({
  intelligenceItem: IntelligenceItemSchema,
  sourceDefinition: SourceDefinitionSchema,
  reportingPeriod: z.object({
    start: isoDateTime,
    end: isoDateTime,
  }).strict(),
  cutoffAt: isoDateTime,
  policyVersion: z.string().min(1).max(80),
}).strict();

const EligibleRankingEligibilitySchema = z.object({
  status: z.literal("eligible"),
  reasonCodes: z.tuple([]),
}).strict();

const ExcludedRankingEligibilitySchema = z.object({
  status: z.literal("excluded"),
  reasonCodes: z.array(z.string().min(1).max(80)).min(1)
    .refine((codes) => new Set(codes).size === codes.length, "Eligibility reason codes must be unique."),
}).strict();

export const RankingEligibilitySchema = z.discriminatedUnion("status", [
  EligibleRankingEligibilitySchema,
  ExcludedRankingEligibilitySchema,
]);

export const RankBandSchema = z.enum(["critical", "high", "medium", "low", "minimal"]);

export const RankingAdjustmentSchema = z.object({
  code: z.string().min(1).max(80),
  kind: z.enum(["penalty", "cap", "exclusion"]),
  value: z.number().finite().nullable(),
  explanation: z.string().min(1).max(500),
}).strict().superRefine((adjustment, context) => {
  if (adjustment.kind === "exclusion" && adjustment.value !== null) {
    context.addIssue({ code: "custom", path: ["value"], message: "Exclusion adjustments cannot have a numeric value." });
  }
  if (adjustment.kind !== "exclusion" && adjustment.value === null) {
    context.addIssue({ code: "custom", path: ["value"], message: "Penalty and cap adjustments require a numeric value." });
  }
});

const RankingAssessmentBaseSchema = z.object({
  id: z.string().min(1).max(200),
  intelligenceItemId: z.string().min(1),
  sourceDefinitionId: z.string().min(1),
  inputDigest: z.string().regex(/^[a-f0-9]{64}$/),
  signals: z.array(RankingSignalSchema).max(RANKING_FACTORS.length),
  adjustments: z.array(RankingAdjustmentSchema).max(20),
  explanationCodes: z.array(z.string().min(1).max(80)).max(30),
  whyRanked: z.array(z.string().min(1).max(500)).max(20),
  policyVersion: z.string().min(1).max(80),
  algorithmVersion: z.string().min(1).max(80),
  analysisModel: z.string().min(1).max(120),
  analysisPromptVersion: z.string().min(1).max(80),
  cutoffAt: isoDateTime,
  createdAt: isoDateTime,
  supersedesAssessmentId: z.string().min(1).max(200).nullable(),
}).strict();

const EligibleRankingAssessmentSchema = RankingAssessmentBaseSchema.extend({
  eligibility: EligibleRankingEligibilitySchema,
  baseScore: Score100Schema,
  finalScore: Score100Schema,
  rankBand: RankBandSchema,
}).strict();

const ExcludedRankingAssessmentSchema = RankingAssessmentBaseSchema.extend({
  eligibility: ExcludedRankingEligibilitySchema,
  baseScore: z.null(),
  finalScore: z.null(),
  rankBand: z.null(),
}).strict();

export const RankingAssessmentSchema = z.union([
  EligibleRankingAssessmentSchema,
  ExcludedRankingAssessmentSchema,
]);

export { SourceTrustLevelSchema };
