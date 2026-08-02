import { z } from "zod";
import { DecisionPositionSchema, type GeminiDecisionOutput, type SignalIntelligence } from "./decision-intelligence";
import { ForbiddenTermSettingsSchema, validateForbiddenTermConfiguration } from "./forbidden-term-detector";

export const EditorialPositionSchema = z.union([
  DecisionPositionSchema,
  z.literal("INSUFFICIENT_EVIDENCE"),
]);
export const EditorialPolicyActionSchema = z.enum(["ALLOW", "DOWNGRADE", "BLOCK", "REQUIRE_HUMAN_REVIEW"]);
export const EditorialPolicySeveritySchema = z.enum(["INFO", "WARNING", "BLOCKING"]);
export const SourceTrustSchema = z.enum(["TRUSTED", "VERIFIED", "UNVERIFIED"]);
export const HumanReviewStateSchema = z.enum(["PENDING", "REVIEWED", "NOT_STARTED"]);
export const EditorialEvidenceStateSchema = z.enum(["SUFFICIENT", "INSUFFICIENT", "UNKNOWN"]);
export const EditorialUncertaintyStateSchema = z.enum([
  "NONE",
  "SOURCE_CONFLICT",
  "PENDING_VERIFICATION",
  "EDITORIAL_DEFER",
  "POLICY_UNCERTAINTY",
  "HUMAN_REVIEW_ONLY",
  "EVIDENCE_INSUFFICIENT",
]);
export const EditorialSourceAuthoritySchema = z.enum(["AUTHORITATIVE", "TRUSTED", "UNVERIFIED", "UNKNOWN"]);
export const EditorialMaterialImpactSchema = z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

const EditorialPolicyRuleSchema = z.object({
  id: z.string().regex(/^EP-[0-9]{3}$/),
  priority: z.number().int().positive(),
  action: EditorialPolicyActionSchema,
  reasonTemplate: z.string().trim().min(10).max(500),
}).strict();

export const EditorialPolicyConstitutionSchema = z.object({
  policyVersion: z.string().regex(/^editorial-policy-v[1-9][0-9]*(?:\.[0-9]+)?$/),
  supportedPositions: z.array(EditorialPositionSchema).min(7),
  actionPriority: z.tuple([
    z.literal("ALLOW"),
    z.literal("DOWNGRADE"),
    z.literal("REQUIRE_HUMAN_REVIEW"),
    z.literal("BLOCK"),
  ]),
  thresholds: z.object({
    actNowMinimumEvidence: z.number().int().min(1).max(10),
    actNowMinimumTrustedSources: z.number().int().min(1).max(10),
    actNowMinimumConfidence: z.number().min(0).max(100),
    actNowMinimumImportance: z.number().min(0).max(100),
    materialScoreDrift: z.number().min(0).max(100),
    materialConfidenceDrift: z.number().min(0).max(100),
  }).strict(),
  strongActNow: z.object({
    allowedSourceAuthority: z.array(EditorialSourceAuthoritySchema).min(1),
    requiredMaterialImpact: EditorialMaterialImpactSchema,
    requireQualifiedConfidence: z.boolean(),
  }).strict().optional(),
  forbiddenTerms: z.array(z.string().trim().min(1).max(100)).min(1),
  forbiddenTermSettings: ForbiddenTermSettingsSchema.optional(),
  rules: z.array(EditorialPolicyRuleSchema).length(8),
}).strict().superRefine((constitution, context) => {
  const expectedIds = new Set(["EP-001", "EP-002", "EP-003", "EP-004", "EP-005", "EP-006", "EP-007", "EP-008"]);
  const ids = new Set<string>();
  const priorities = new Set<number>();
  constitution.rules.forEach((rule, index) => {
    if (ids.has(rule.id)) context.addIssue({ code: "custom", path: ["rules", index, "id"], message: "Rule IDs must be unique." });
    if (priorities.has(rule.priority)) context.addIssue({ code: "custom", path: ["rules", index, "priority"], message: "Rule priorities must be unique." });
    ids.add(rule.id);
    priorities.add(rule.priority);
  });
  expectedIds.forEach((id) => {
    if (!ids.has(id)) context.addIssue({ code: "custom", path: ["rules"], message: `Required rule ${id} is missing.` });
  });
  if (new Set(constitution.supportedPositions).size !== constitution.supportedPositions.length) {
    context.addIssue({ code: "custom", path: ["supportedPositions"], message: "Supported positions must be unique." });
  }
  const normalizedTerms = constitution.forbiddenTerms.map((term) => term.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase());
  if (new Set(normalizedTerms).size !== normalizedTerms.length) {
    context.addIssue({ code: "custom", path: ["forbiddenTerms"], message: "Forbidden terms must be unique after normalization." });
  }
  try {
    validateForbiddenTermConfiguration(constitution.forbiddenTerms, constitution.forbiddenTermSettings);
  } catch (error) {
    context.addIssue({ code: "custom", path: ["forbiddenTerms"], message: error instanceof Error ? error.message : "Invalid forbidden-term configuration." });
  }
});

export const EditorialPolicyContextSchema = z.object({
  itemId: z.string().trim().min(1).max(200),
  allowedPositions: z.array(DecisionPositionSchema),
  sourceTrust: SourceTrustSchema,
  trustedSourceCount: z.number().int().nonnegative(),
  hasSourceConflict: z.boolean(),
  promotionalContent: z.boolean(),
  lowImpactContent: z.boolean(),
  numericalOrDateSensitive: z.boolean(),
  pendingVerification: z.boolean(),
  humanReviewState: HumanReviewStateSchema,
  configuredForbiddenTerms: z.array(z.string().trim().min(1).max(100)),
  preDetectedForbiddenTerms: z.array(z.string().trim().min(1).max(100)).default([]),
  evidenceState: EditorialEvidenceStateSchema.default("UNKNOWN"),
  uncertaintyState: EditorialUncertaintyStateSchema.default("NONE"),
  sourceAuthority: EditorialSourceAuthoritySchema.default("UNKNOWN"),
  materialImpact: EditorialMaterialImpactSchema.default("UNKNOWN"),
  confidenceQualified: z.boolean().default(false),
  numericalClaimsVerified: z.boolean().default(false),
  normalApplicationReviewRequired: z.literal(true).default(true),
  scoreDrift: z.number().nonnegative().optional(),
  confidenceDrift: z.number().nonnegative().optional(),
}).strict();

export interface EditorialPolicyInput {
  signal: SignalIntelligence;
  decision?: GeminiDecisionOutput;
  decisionText: string;
  context: z.input<typeof EditorialPolicyContextSchema>;
}

export interface EditorialPolicyFacts {
  originalPosition: z.infer<typeof EditorialPositionSchema>;
  evidenceCount: number;
  evidenceIds: string[];
  signalImportance: number;
  confidence: number;
  decisionText: string;
  context: z.input<typeof EditorialPolicyContextSchema>;
}

export const EditorialPolicyReasonSchema = z.object({
  ruleId: z.string().regex(/^EP-[0-9]{3}$/),
  message: z.string().min(1).max(500),
  affectedField: z.string().min(1).max(100),
  severity: EditorialPolicySeveritySchema,
  evidenceIds: z.array(z.string().regex(/^E[1-9][0-9]*$/)).max(10),
  originalPosition: EditorialPositionSchema,
  effectivePosition: EditorialPositionSchema,
  humanReviewRequired: z.boolean(),
}).strict();

export const EditorialPolicyResultSchema = z.object({
  policyVersion: z.string().min(1),
  originalPosition: EditorialPositionSchema,
  effectivePosition: EditorialPositionSchema,
  action: EditorialPolicyActionSchema,
  reasons: z.array(EditorialPolicyReasonSchema),
  triggeredRuleIds: z.array(z.string().regex(/^EP-[0-9]{3}$/)),
  humanReviewRequired: z.boolean(),
  normalApplicationReviewRequired: z.literal(true),
  additionalPolicyReviewRequired: z.boolean(),
  forbiddenTermsDetected: z.array(z.string().max(100)),
  policyScore: z.number().int().min(0).max(100),
  auditMetadata: z.object({
    itemId: z.string().max(200),
    evaluatedAt: z.string().datetime({ offset: true }),
    modelIndependent: z.literal(true),
  }).strict(),
}).strict();

export type EditorialPolicyConstitution = z.infer<typeof EditorialPolicyConstitutionSchema>;
export type EditorialPolicyContext = z.infer<typeof EditorialPolicyContextSchema>;
export type EditorialPolicyPosition = z.infer<typeof EditorialPositionSchema>;
export type EditorialPolicyAction = z.infer<typeof EditorialPolicyActionSchema>;
export type EditorialPolicyResult = z.infer<typeof EditorialPolicyResultSchema>;
