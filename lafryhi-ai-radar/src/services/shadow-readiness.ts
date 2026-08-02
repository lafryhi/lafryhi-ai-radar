import { isAbsolute, resolve, sep } from "node:path";
import { EditorialPolicyConstitutionSchema } from "@/domain/editorial-policy";
import { EVALUATION_SIDE_EFFECT_CAPABILITIES } from "./evaluation/evaluation-engine";
import { validateEvaluationDataset } from "./evaluation/dataset-validator";
import { validateEvaluationEditorialPolicyContexts } from "./evaluation/editorial-context";
import {
  APPROVED_PRODUCTION_MODEL,
  ShadowReadinessChecklistSchema,
  TraceabilityIdentifiersSchema,
  validateShadowVersionCompatibility,
  type TraceabilityIdentifiers,
} from "./release-governance";

export interface ShadowReadinessInput {
  repositoryRoot: string;
  productionModel: string;
  fallbackModel: string;
  candidateModel: string;
  candidateUse: "EVALUATION_ONLY" | "PRODUCTION";
  trafficPercentage: number;
  publicationEnabled: boolean;
  cloudRunWriteEnabled: boolean;
  firestoreWriteEnabled: boolean;
  reportDestination: string;
  rawOutputsEnabled: boolean;
  inputsRedacted: boolean;
  reviewPipelineEnabled: boolean;
  dataset: unknown;
  editorialPolicyConstitution: unknown;
  versions: unknown;
  traceabilitySample?: TraceabilityIdentifiers;
  generatedAt: string;
}

function repositoryDestination(repositoryRoot: string, destination: string) {
  if (!destination.trim() || isAbsolute(destination) || destination.split(/[\\/]+/).includes("..")) return false;
  const root = resolve(repositoryRoot);
  const target = resolve(root, destination);
  return target === root || target.startsWith(`${root}${sep}`);
}

export function validateShadowReadiness(input: ShadowReadinessInput) {
  const checks: Array<{
    id: string;
    description: string;
    passed: boolean;
    severity: "BLOCKING" | "CRITICAL";
    automaticCheck: string;
    manualCheck: string;
    evidence: string[];
  }> = [];
  const add = (
    id: string,
    description: string,
    passed: boolean,
    severity: "BLOCKING" | "CRITICAL",
    automaticCheck: string,
    manualCheck: string,
    evidence: string[],
  ) => checks.push({ id, description, passed, severity, automaticCheck, manualCheck, evidence });

  add("SR-001", "Production and fallback models remain immutable and approved.", input.productionModel === APPROVED_PRODUCTION_MODEL && input.fallbackModel === APPROVED_PRODUCTION_MODEL, "CRITICAL", "Exact model-ID equality", "Confirm runtime environment snapshot", [input.productionModel, input.fallbackModel]);
  add("SR-002", "Candidate is distinct and restricted to evaluation-only use.", input.candidateUse === "EVALUATION_ONLY" && Boolean(input.candidateModel) && input.candidateModel !== input.productionModel, "CRITICAL", "Candidate-use and model separation", "Confirm no candidate in production manifest", [input.candidateUse, input.candidateModel || "[missing]"]);
  add("SR-003", "Shadow traffic allocation remains exactly zero percent.", input.trafficPercentage === 0, "CRITICAL", "Traffic percentage equals zero", "Confirm no traffic or canary operation", [`${input.trafficPercentage}%`]);
  add("SR-004", "Publication capability is disabled for evaluation.", !input.publicationEnabled && !EVALUATION_SIDE_EFFECT_CAPABILITIES.publicationCalls, "CRITICAL", "Publication flags are false", "Review publication isolation boundary", ["publication=false"]);
  add("SR-005", "Cloud Run mutation capability is disabled.", !input.cloudRunWriteEnabled, "CRITICAL", "Cloud Run write flag is false", "Confirm operator executes no deployment command", ["cloudRunWrites=false"]);
  add("SR-006", "Firestore mutation capability is disabled.", !input.firestoreWriteEnabled && !EVALUATION_SIDE_EFFECT_CAPABILITIES.firestoreWrites, "CRITICAL", "Firestore write flags are false", "Confirm evaluation service account scope", ["firestoreWrites=false"]);
  add("SR-007", "Report destination is repository-relative and traversal-safe.", repositoryDestination(input.repositoryRoot, input.reportDestination), "BLOCKING", "Path containment validation", "Confirm storage retention and access", [input.reportDestination]);
  add("SR-008", "Raw outputs are disabled and evaluation inputs are redacted.", !input.rawOutputsEnabled && input.inputsRedacted, "CRITICAL", "Privacy controls validation", "Review a sanitized sample report", [`raw=${input.rawOutputsEnabled}`, `redacted=${input.inputsRedacted}`]);
  add("SR-009", "Mandatory application human-review pipeline remains enabled.", input.reviewPipelineEnabled, "CRITICAL", "Review pipeline flag is true", "Reviewer confirms staffing and escalation", [`review=${input.reviewPipelineEnabled}`]);

  let datasetValid = false;
  try {
    const dataset = validateEvaluationDataset(input.dataset);
    validateEvaluationEditorialPolicyContexts(dataset.cases.map((item) => item.id));
    datasetValid = true;
  } catch {
    datasetValid = false;
  }
  add("SR-010", "Evaluation dataset and semantic fixtures pass strict validation.", datasetValid, "BLOCKING", "Dataset and fixture schemas", "Approve dataset provenance and representativeness", [`valid=${datasetValid}`]);

  let policyValid = false;
  try {
    const policy = EditorialPolicyConstitutionSchema.parse(input.editorialPolicyConstitution);
    policyValid = policy.policyVersion === "editorial-policy-v1.1";
  } catch {
    policyValid = false;
  }
  add("SR-011", "Editorial policy constitution is valid and pinned to v1.1.", policyValid, "CRITICAL", "Strict constitution schema and version pin", "Editorial governor signs off policy", [`valid=${policyValid}`]);

  let versionsValid = false;
  try {
    validateShadowVersionCompatibility(input.versions);
    versionsValid = true;
  } catch {
    versionsValid = false;
  }
  add("SR-012", "Dataset, fixture, policy, evaluation, and report versions are compatible.", versionsValid, "BLOCKING", "Compatibility matrix validation", "Confirm historical reports are not mixed", [`valid=${versionsValid}`]);

  const traceabilityValid = TraceabilityIdentifiersSchema.safeParse(input.traceabilitySample).success;
  add("SR-013", "Decision-chain identifiers cover evaluation through publication.", traceabilityValid, "BLOCKING", "Traceability schema sample", "Reviewer reconstructs one saved case", [`valid=${traceabilityValid}`]);

  const requirements = checks.map((check) => ({
    id: check.id,
    description: check.description,
    status: check.passed ? "PASS" as const : "FAIL" as const,
    severity: check.severity,
    automaticCheck: check.automaticCheck,
    manualCheck: check.manualCheck,
    evidence: check.evidence,
  }));
  const overallStatus = requirements.some((item) => item.status === "FAIL") ? "BLOCKED" as const : "READY" as const;
  return ShadowReadinessChecklistSchema.parse({
    schemaVersion: "shadow-readiness-v1",
    generatedAt: input.generatedAt,
    approvedProductionModel: APPROVED_PRODUCTION_MODEL,
    candidateModel: input.candidateModel,
    overallStatus,
    requirements,
  });
}

export function assertShadowReady(input: ShadowReadinessInput) {
  const checklist = validateShadowReadiness(input);
  if (checklist.overallStatus !== "READY") {
    const blockers = checklist.requirements.filter((item) => item.status === "FAIL").map((item) => item.id);
    throw new Error(`Shadow readiness validation failed before model execution: ${blockers.join(", ")}.`);
  }
  return checklist;
}
