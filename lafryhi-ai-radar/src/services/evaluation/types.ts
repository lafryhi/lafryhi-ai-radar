import { z } from "zod";
import { BusinessContextSchema, type GeminiDecisionOutput, type SignalIntelligence } from "@/domain/decision-intelligence";
import type { EditorialPolicyResult } from "@/domain/editorial-policy";
import type { TraceabilityIdentifiers } from "../release-governance";
import type { ForbiddenTermAdjudication } from "@/domain/forbidden-term-detector";

export const EvaluationExpectationSchema = z.object({
  minimumEvidenceCount: z.number().int().nonnegative(),
  expectedStatus: z.enum(["accepted", "pending", "rejected"]),
  allowedDecisionValues: z.array(z.enum(["ACT_NOW", "RUN_EXPERIMENT", "MONITOR", "DEFER", "IGNORE", "AVOID"])),
  requiredKeywords: z.array(z.string()),
  requiredKeywordAlternatives: z.array(z.array(z.string().min(1)).min(1)).default([]),
  forbiddenKeywords: z.array(z.string()),
  mustReturnInsufficientEvidence: z.boolean(),
}).strict();

export const EvaluationCaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  category: z.string().min(1),
  language: z.enum(["en", "fr", "ar"]),
  smokeTest: z.boolean().default(false),
  source: z.object({
    title: z.string().min(1),
    url: z.string().url(),
    publisher: z.string().min(1),
    publishedAt: z.string().datetime({ offset: true }),
    content: z.string().min(20).max(100_000),
  }).strict(),
  businessContext: BusinessContextSchema,
  editorialPolicyContext: z.object({
    evidenceState: z.enum(["SUFFICIENT", "INSUFFICIENT", "UNKNOWN"]),
    uncertaintyState: z.enum([
      "NONE",
      "SOURCE_CONFLICT",
      "PENDING_VERIFICATION",
      "EDITORIAL_DEFER",
      "POLICY_UNCERTAINTY",
      "HUMAN_REVIEW_ONLY",
      "EVIDENCE_INSUFFICIENT",
    ]),
    sourceAuthority: z.enum(["AUTHORITATIVE", "TRUSTED", "UNVERIFIED", "UNKNOWN"]),
    materialImpact: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]),
    confidenceQualified: z.boolean(),
    numericalClaimsVerified: z.boolean(),
  }).strict().optional(),
  expectations: EvaluationExpectationSchema,
  tags: z.array(z.string()),
}).strict();

export const EvaluationDatasetSchema = z.object({
  datasetVersion: z.literal("1.0"),
  name: z.string().min(1),
  description: z.string().min(1),
  cases: z.array(EvaluationCaseSchema).min(15),
}).strict().superRefine((dataset, context) => {
  const ids = new Set<string>();
  dataset.cases.forEach((item, index) => {
    if (ids.has(item.id)) context.addIssue({ code: "custom", path: ["cases", index, "id"], message: "Case IDs must be unique." });
    ids.add(item.id);
  });
  if (dataset.cases.filter((item) => item.smokeTest).length !== 1) {
    context.addIssue({ code: "custom", path: ["cases"], message: "Dataset must contain exactly one smoke-test case." });
  }
});

export type EvaluationDataset = z.infer<typeof EvaluationDatasetSchema>;
export type EvaluationCase = z.infer<typeof EvaluationCaseSchema>;

export interface StageEvaluationResult {
  requestedModel: string;
  actualModel: string;
  fallbackUsed: boolean;
  attempts: number;
  durationMs: number;
  requestSucceeded: boolean;
  jsonParseValid: boolean;
  schemaValid: boolean;
  applicationValid: boolean;
  exactQuoteValid: boolean;
  evidenceIdsValid: boolean;
  enumValid: boolean;
  insufficientEvidence: boolean;
  candidateCount: number;
  finishReason?: string;
  safetyState?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  modelVersion?: string;
  failureCategory?: string;
  sanitizedError?: string;
  transportSuccess?: boolean;
  responseReceived?: boolean;
  jsonParsed?: boolean;
  schemaVersionMatched?: string;
  failedStage?: "REQUEST" | "RESPONSE" | "JSON_PARSE" | "SCHEMA" | "APPLICATION_VALIDATION" | "PIPELINE" | "HARNESS";
  validationErrors?: string[];
  requestErrorCategory?: string;
  stageDurations?: { requestMs: number; validationMs: number; totalMs: number };
  promotionImpact?: "NONE" | "RELIABILITY_FAILURE" | "CONTRACT_FAILURE" | "APPLICATION_FAILURE" | "PIPELINE_FAILURE" | "INTEGRITY_FAILURE";
}

export interface ModelCaseResult {
  model: string;
  signal: StageEvaluationResult;
  decision?: StageEvaluationResult;
  pipelineCompleted: boolean;
  status: "READY" | "INSUFFICIENT_EVIDENCE" | "FAILED";
  recommendation?: string;
  score?: number;
  confidence?: number;
  relevance?: number;
  evidenceCount: number;
  outputText: string;
  validatedSignal?: SignalIntelligence;
  validatedDecision?: GeminiDecisionOutput;
  editorialPolicy?: EditorialPolicyResult;
  forbiddenTermAdjudication?: ForbiddenTermAdjudication & {
    expectationResult: boolean;
    policyResult: boolean;
    detectorAgreement: boolean;
  };
}

export interface EvaluationCaseResult {
  caseId: string;
  traceability?: TraceabilityIdentifiers;
  category: string;
  language: string;
  source?: { title: string; url: string; publisher: string; publishedAt: string; content?: string };
  baseline: ModelCaseResult;
  candidate: ModelCaseResult;
  policyExpectation?: {
    allowedPositions: string[];
  };
  expectationChecks: {
    requiredKeywords: boolean;
    forbiddenKeywords: boolean;
    insufficientEvidenceCorrect: boolean;
    unsupportedClaims: boolean;
    quotationMismatch: boolean;
    missingRequiredKeywords?: string[];
    forbiddenTermDetectorAgreement?: boolean;
  };
  invariantViolations: string[];
}

export interface ModelMetrics {
  transportSuccessRate?: number;
  responseReceivedRate?: number;
  requestSuccessRate: number;
  jsonParseSuccessRate: number;
  schemaValidRate: number;
  applicationValidationRate: number;
  exactEvidenceRate: number;
  evidenceIdComplianceRate: number;
  enumComplianceRate: number;
  pipelineCompletionRate: number;
  insufficientEvidenceCorrectnessRate: number;
  meanLatencyMs: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
  averageAttempts: number;
  fallbackRate: number;
  timeoutRate: number;
  averageInputTokens?: number;
  averageOutputTokens?: number;
  averageTotalTokens?: number;
  missingTokenMetadataRate: number;
}

export interface ComparativeMetrics {
  statusAgreementRate: number;
  recommendationAgreementRate: number;
  rawStatusAgreementRate?: number;
  rawRecommendationAgreementRate?: number;
  policyAdjustedRecommendationAgreementRate?: number;
  effectivePositionOverrideRate?: number;
  effectivePositionDowngradeRate?: number;
  effectivePositionUpgradeRate?: number;
  actionDowngradeRate?: number;
  requireHumanReviewRate?: number;
  normalApplicationReviewRate?: number;
  pendingPathConversionRate?: number;
  blockRate?: number;
  /** @deprecated Use effectivePositionOverrideRate. */
  policyOverrideRate?: number;
  /** @deprecated Use effectivePositionDowngradeRate. */
  policyDowngradeRate?: number;
  /** @deprecated Use blockRate. */
  policyBlockRate?: number;
  /** @deprecated Use requireHumanReviewRate. */
  policyHumanReviewRate?: number;
  forbiddenTermDetectionRate?: number;
  overEscalationCorrectionRate?: number;
  excessiveConservatismCorrectionRate?: number;
  outOfPolicyRecommendationCorrectionRate?: number;
  meanScoreDrift: number;
  meanConfidenceDrift: number;
  meanRelevanceDrift: number;
  meanEvidenceCountDrift: number;
  insufficientEvidenceAgreementRate: number;
  requiredKeywordComplianceRate: number;
  forbiddenKeywordViolationRate: number;
  unsupportedClaimRate: number;
  quotationMismatchRate: number;
}

export type PromotionSeverity = "pass" | "warning" | "fail" | "critical";
export type PromotionRecommendation = "NOT_ELIGIBLE" | "ELIGIBLE_FOR_MORE_TESTING" | "ELIGIBLE_FOR_CANARY";
export type EvaluationIntegrity =
  | "INVALID_CONFIGURATION"
  | "INVALID_DATASET"
  | "INVALID_DATASET_EXPECTATION"
  | "INVALID_CONTRACT"
  | "INVALID_REPORT_CONTRACT"
  | "INVALID_HARNESS"
  | "INCONCLUSIVE_PROVIDER_FAILURE"
  | "INCONCLUSIVE_BUDGET_STOP"
  | "INCONCLUSIVE_OTHER"
  | "INCONCLUSIVE"
  | "VALID";
export type QualityMetricsAdmissibility = "ADMISSIBLE" | "OBSERVATIONAL_ONLY" | "UNAVAILABLE";

export interface PromotionCheck { name: string; severity: PromotionSeverity; actual: number | boolean; threshold: string }
export interface PromotionResult {
  recommendation: PromotionRecommendation | "INCONCLUSIVE";
  checks: PromotionCheck[];
  criticalInvariantViolations: string[];
  integrity: EvaluationIntegrity;
  integrityReasons: string[];
}
