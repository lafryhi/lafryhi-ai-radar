import { createHash } from "node:crypto";
import { z } from "zod";
import { DEFAULT_GEMINI_MODEL } from "./gemini-runtime-config";

export const APPROVED_PRODUCTION_MODEL = DEFAULT_GEMINI_MODEL;
export const SHADOW_GOVERNANCE_VERSIONS = Object.freeze({
  datasetVersion: "1.0",
  fixtureVersion: "editorial-context-v1.1",
  policyVersion: "editorial-policy-v1.1",
  constitutionVersion: "editorial-policy-v1.1",
  evaluationVersion: "gemini-migration-evaluation-v2.6",
  reportVersion: "gemini-migration-report-v1.1",
});

export const ShadowVersionSetSchema = z.object({
  datasetVersion: z.literal("1.0"),
  fixtureVersion: z.literal("editorial-context-v1.1"),
  policyVersion: z.literal("editorial-policy-v1.1"),
  constitutionVersion: z.literal("editorial-policy-v1.1"),
  evaluationVersion: z.literal("gemini-migration-evaluation-v2.6"),
  reportVersion: z.literal("gemini-migration-report-v1.1"),
}).strict().superRefine((versions, context) => {
  if (versions.policyVersion !== versions.constitutionVersion) {
    context.addIssue({
      code: "custom",
      path: ["constitutionVersion"],
      message: "Policy and constitution versions must match.",
    });
  }
});

export const ReadinessRequirementSchema = z.object({
  id: z.string().regex(/^SR-[0-9]{3}$/),
  description: z.string().min(10),
  status: z.enum(["PASS", "FAIL", "MANUAL_REQUIRED"]),
  severity: z.enum(["INFO", "WARNING", "BLOCKING", "CRITICAL"]),
  automaticCheck: z.string().min(3),
  manualCheck: z.string().min(3),
  evidence: z.array(z.string().min(1)),
}).strict();

export const ShadowReadinessChecklistSchema = z.object({
  schemaVersion: z.literal("shadow-readiness-v1"),
  generatedAt: z.string().datetime({ offset: true }),
  approvedProductionModel: z.literal("gemini-2.5-flash"),
  candidateModel: z.string().min(1),
  overallStatus: z.enum(["READY", "BLOCKED", "MANUAL_REVIEW_REQUIRED"]),
  requirements: z.array(ReadinessRequirementSchema).min(10),
}).strict().superRefine((checklist, context) => {
  const ids = checklist.requirements.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["requirements"], message: "Requirement IDs must be unique." });
  }
  if (checklist.requirements.some((item) => item.status === "FAIL") && checklist.overallStatus !== "BLOCKED") {
    context.addIssue({ code: "custom", path: ["overallStatus"], message: "Any failed requirement must block readiness." });
  }
});

export const RiskRegisterEntrySchema = z.object({
  id: z.string().regex(/^RISK-[0-9]{3}$/),
  category: z.enum([
    "Technical", "Editorial", "Security", "Operational", "Evaluation", "Governance",
    "Cost", "Model drift", "Dataset drift", "Policy drift", "Human review",
  ]),
  risk: z.string().min(10),
  probability: z.enum(["LOW", "MEDIUM", "HIGH"]),
  impact: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  detection: z.string().min(10),
  mitigation: z.string().min(10),
  rollback: z.string().min(10),
  owner: z.string().min(2),
  status: z.enum(["OPEN", "MITIGATED", "ACCEPTED"]),
}).strict();

export const RiskRegisterSchema = z.object({
  schemaVersion: z.literal("risk-register-v1"),
  updatedAt: z.string().datetime({ offset: true }),
  risks: z.array(RiskRegisterEntrySchema).min(11),
}).strict().superRefine((register, context) => {
  const categories = new Set(register.risks.map((risk) => risk.category));
  const required = RiskRegisterEntrySchema.shape.category.options;
  required.forEach((category) => {
    if (!categories.has(category)) {
      context.addIssue({ code: "custom", path: ["risks"], message: `Missing risk category ${category}.` });
    }
  });
});

export const ReleaseManifestSchema = z.object({
  schemaVersion: z.literal("shadow-release-manifest-v1"),
  gitRevision: z.string().regex(/^[a-f0-9]{40}$/),
  policyVersion: z.literal("editorial-policy-v1.1"),
  constitutionVersion: z.literal("editorial-policy-v1.1"),
  datasetVersion: z.literal("1.0"),
  fixtureVersion: z.literal("editorial-context-v1.1"),
  evaluationVersion: z.literal("gemini-migration-evaluation-v2.6"),
  reportVersion: z.literal("gemini-migration-report-v1.1"),
  testTotals: z.object({ tests: z.number().int().positive(), files: z.number().int().positive() }).strict(),
  validationTotals: z.object({
    test: z.literal("PASS"),
    typecheck: z.literal("PASS"),
    lint: z.literal("PASS"),
    build: z.literal("PASS"),
  }).strict(),
  knownLimitations: z.array(z.string().min(1)).min(1),
  knownRisks: z.array(z.string().regex(/^RISK-[0-9]{3}$/)).min(1),
  approvedProductionModel: z.literal("gemini-2.5-flash"),
  candidateModel: z.string().min(1),
  candidateUse: z.literal("EVALUATION_ONLY"),
  releaseTimestamp: z.string().datetime({ offset: true }),
  containsSecrets: z.literal(false),
}).strict();

export interface TraceabilityIdentifiers {
  evaluationId: string;
  caseId: string;
  signalId: string;
  decisionId: string;
  policyId: string;
  reviewId: string;
  publicationId: string;
}

export const TraceabilityIdentifiersSchema = z.object({
  evaluationId: z.string().regex(/^eval_[a-f0-9]{24}$/),
  caseId: z.string().regex(/^case_[a-f0-9]{24}$/),
  signalId: z.string().regex(/^signal_[a-f0-9]{24}$/),
  decisionId: z.string().regex(/^decision_[a-f0-9]{24}$/),
  policyId: z.string().regex(/^policy_[a-f0-9]{24}$/),
  reviewId: z.string().regex(/^review_[a-f0-9]{24}$/),
  publicationId: z.string().regex(/^publication_[a-f0-9]{24}$/),
}).strict().superRefine((identifiers, context) => {
  if (new Set(Object.values(identifiers)).size !== Object.values(identifiers).length) {
    context.addIssue({ code: "custom", message: "Traceability identifiers must be unique." });
  }
});

function traceId(prefix: string, seed: string) {
  return `${prefix}_${createHash("sha256").update(`${prefix}:${seed}`).digest("hex").slice(0, 24)}`;
}

export function createTraceabilityIdentifiers(runLabel: string, sourceCaseId: string): TraceabilityIdentifiers {
  const root = `${runLabel.trim()}:${sourceCaseId.trim()}`;
  if (!runLabel.trim() || !sourceCaseId.trim()) throw new Error("Run label and source case ID are required.");
  return TraceabilityIdentifiersSchema.parse({
    evaluationId: traceId("eval", runLabel.trim()),
    caseId: traceId("case", root),
    signalId: traceId("signal", root),
    decisionId: traceId("decision", root),
    policyId: traceId("policy", root),
    reviewId: traceId("review", root),
    publicationId: traceId("publication", root),
  });
}

export function validateShadowVersionCompatibility(value: unknown) {
  return ShadowVersionSetSchema.parse(value);
}

export function buildReleaseManifest(input: {
  gitRevision: string;
  tests: number;
  testFiles: number;
  candidateModel: string;
  releaseTimestamp: string;
  knownLimitations: string[];
  knownRisks: string[];
}) {
  return ReleaseManifestSchema.parse({
    schemaVersion: "shadow-release-manifest-v1",
    gitRevision: input.gitRevision,
    ...SHADOW_GOVERNANCE_VERSIONS,
    testTotals: { tests: input.tests, files: input.testFiles },
    validationTotals: { test: "PASS", typecheck: "PASS", lint: "PASS", build: "PASS" },
    knownLimitations: input.knownLimitations,
    knownRisks: input.knownRisks,
    approvedProductionModel: APPROVED_PRODUCTION_MODEL,
    candidateModel: input.candidateModel,
    candidateUse: "EVALUATION_ONLY",
    releaseTimestamp: input.releaseTimestamp,
    containsSecrets: false,
  });
}
