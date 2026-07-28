import { z } from "zod";
import { AnalysisCategorySchema, EntityTypeSchema } from "./schemas";

const ScoreSchema = z.number().int().min(0).max(100);
const EvidenceIdSchema = z.string().regex(/^E[1-9][0-9]*$/);
const EvidenceIdsSchema = z.array(EvidenceIdSchema).min(1).max(10);

export const GroundedClaimSchema = z.object({
  text: z.string().trim().min(1).max(1_000),
  evidenceIds: EvidenceIdsSchema,
}).strict();

export const SignalEvidenceSchema = z.object({
  id: EvidenceIdSchema,
  quote: z.string().trim().min(1).max(500),
  significance: z.string().trim().min(1).max(500),
}).strict();

const SignalEntitySchema = z.object({
  name: z.string().trim().min(1).max(160),
  normalizedName: z.string().trim().min(1).max(160),
  type: EntityTypeSchema,
  evidenceIds: EvidenceIdsSchema,
}).strict();

const ReadySignalIntelligenceSchema = z.object({
  status: z.literal("READY"),
  category: AnalysisCategorySchema,
  whatHappened: z.array(GroundedClaimSchema).min(1).max(5),
  whatChanged: z.array(GroundedClaimSchema).min(1).max(5),
  whyImportant: z.array(GroundedClaimSchema).min(1).max(5),
  technologies: z.array(GroundedClaimSchema).max(12),
  affectedIndustries: z.array(GroundedClaimSchema).max(12),
  risks: z.array(GroundedClaimSchema).max(10),
  opportunities: z.array(GroundedClaimSchema).max(10),
  entities: z.array(SignalEntitySchema).max(30),
  evidence: z.array(SignalEvidenceSchema).min(1).max(10),
  signalImportance: ScoreSchema,
  evidenceConfidence: ScoreSchema,
  warnings: z.array(z.string().trim().min(1).max(500)).max(10),
}).strict();

const InsufficientSignalIntelligenceSchema = z.object({
  status: z.literal("INSUFFICIENT_EVIDENCE"),
  reason: z.string().trim().min(10).max(1_000),
  missingEvidence: z.array(z.string().trim().min(1).max(300)).min(1).max(10),
  evidence: z.array(SignalEvidenceSchema).max(10),
}).strict();

export const SignalIntelligenceSchema = z.discriminatedUnion("status", [
  ReadySignalIntelligenceSchema,
  InsufficientSignalIntelligenceSchema,
]);

export const BusinessContextSchema = z.object({
  industry: z.string().trim().min(1).max(160),
  companySize: z.enum(["SOLO", "MICRO", "SMALL", "MEDIUM"]),
  aiMaturity: z.enum(["NONE", "EXPLORING", "PILOTING", "OPERATIONAL", "ADVANCED"]),
  businessGoals: z.array(z.string().trim().min(1).max(300)).min(1).max(10),
  currentTools: z.array(z.string().trim().min(1).max(160)).max(20),
  budgetRange: z.enum(["NO_BUDGET", "UNDER_1K", "1K_TO_10K", "10K_TO_50K", "OVER_50K", "UNKNOWN"]),
  riskTolerance: z.enum(["LOW", "MODERATE", "HIGH"]),
}).strict();

export const DecisionPositionSchema = z.enum([
  "ACT_NOW",
  "RUN_EXPERIMENT",
  "MONITOR",
  "DEFER",
  "IGNORE",
  "AVOID",
]);

const DecisionOptionSchema = z.object({
  position: DecisionPositionSchema,
  description: z.string().trim().min(1).max(800),
  supportingEvidenceIds: EvidenceIdsSchema,
}).strict();

const EstimatedEffortSchema = z.object({
  level: z.enum(["LOW", "MEDIUM", "HIGH"]),
  rationale: z.string().trim().min(1).max(500),
  supportingEvidenceIds: EvidenceIdsSchema,
}).strict();

const GeminiDecisionOutputReadySchema = z.object({
  status: z.literal("READY"),
  decisionQuestion: z.string().trim().min(1).max(500),
  geminiInsight: z.array(GroundedClaimSchema).min(1).max(5),
  businessImpact: z.array(GroundedClaimSchema).min(1).max(5),
  availableOptions: z.array(DecisionOptionSchema).min(2).max(6),
  recommendedPosition: DecisionPositionSchema,
  recommendedAction: z.string().trim().min(1).max(1_000),
  recommendationEvidenceIds: EvidenceIdsSchema,
  expectedBenefits: z.array(GroundedClaimSchema).max(10),
  potentialRisks: z.array(GroundedClaimSchema).max(10),
  estimatedEffort: EstimatedEffortSchema,
  confidence: ScoreSchema,
  supportingEvidenceIds: EvidenceIdsSchema,
  successCriteria: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
  reconsiderationTriggers: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
  businessApplicability: ScoreSchema,
  urgency: ScoreSchema,
  expectedImpact: ScoreSchema,
}).strict();

const GeminiDecisionOutputInsufficientSchema = z.object({
  status: z.literal("INSUFFICIENT_EVIDENCE"),
  reason: z.string().trim().min(10).max(1_000),
  missingEvidence: z.array(z.string().trim().min(1).max(300)).min(1).max(10),
}).strict();

export const GeminiDecisionOutputSchema = z.discriminatedUnion("status", [
  GeminiDecisionOutputReadySchema,
  GeminiDecisionOutputInsufficientSchema,
]);

export const DecisionScoreSchema = z.object({
  signalImportance: ScoreSchema,
  evidenceConfidence: ScoreSchema,
  businessApplicability: ScoreSchema,
  urgency: ScoreSchema,
  expectedImpact: ScoreSchema,
  decisionScore: ScoreSchema,
}).strict();

export const DecisionBriefSchema = GeminiDecisionOutputReadySchema.omit({
  status: true,
  businessApplicability: true,
  urgency: true,
  expectedImpact: true,
}).extend({
  businessContext: BusinessContextSchema,
  supportingEvidence: z.array(SignalEvidenceSchema).min(1).max(10),
  score: DecisionScoreSchema,
}).strict();

export const DecisionEngineResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("READY"),
    signalIntelligence: ReadySignalIntelligenceSchema,
    decisionBrief: DecisionBriefSchema,
  }).strict(),
  z.object({
    status: z.literal("INSUFFICIENT_EVIDENCE"),
    stage: z.enum(["SIGNAL_INTELLIGENCE", "DECISION_INTELLIGENCE"]),
    reason: z.string().trim().min(10).max(1_000),
    missingEvidence: z.array(z.string().trim().min(1).max(300)).min(1).max(10),
  }).strict(),
]);

export type SignalIntelligence = z.infer<typeof SignalIntelligenceSchema>;
export type ReadySignalIntelligence = z.infer<typeof ReadySignalIntelligenceSchema>;
export type BusinessContext = z.infer<typeof BusinessContextSchema>;
export type GeminiDecisionOutput = z.infer<typeof GeminiDecisionOutputSchema>;
export type DecisionBrief = z.infer<typeof DecisionBriefSchema>;
export type DecisionEngineResult = z.infer<typeof DecisionEngineResultSchema>;
