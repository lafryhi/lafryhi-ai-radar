import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import type { GeminiRuntimeConfig } from "../gemini-runtime-config";
import { GOOGLE_GENAI_SDK_VERSION } from "../gemini-runtime-config";
import { z } from "zod";
import { EDITORIAL_POLICY_CONSTITUTION } from "../editorial-policy-engine";
import { SHADOW_GOVERNANCE_VERSIONS } from "../release-governance";
import type { QualityMetricsAdmissibility } from "./types";

export const EvaluationReportSchema = z.object({
  evaluationId: z.string().regex(/^eval_[a-f0-9]{24}$/),
  evaluationContractVersion: z.literal("gemini-migration-evaluation-v2.6"),
  reportContractVersion: z.literal("gemini-migration-report-v1.1"),
  releaseManifestReference: z.literal("release/release-manifest.json"),
  gitRevision: z.string().regex(/^[a-f0-9]{40}$/),
  policyVersion: z.literal("editorial-policy-v1.1"),
  constitutionVersion: z.literal("editorial-policy-v1.1"),
  datasetVersion: z.literal("1.0"),
  editorialContextVersion: z.literal("editorial-context-v1.1"),
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }),
  durationMs: z.number().int().nonnegative(),
  integrityClassification: z.string().min(1),
  qualityMetricsAdmissibility: z.enum(["ADMISSIBLE", "OBSERVATIONAL_ONLY", "UNAVAILABLE"]),
  timestamp: z.string().datetime({ offset: true }),
  sdkVersion: z.string().min(1),
  productionModel: z.string().min(1),
  candidateModel: z.string().min(1),
  candidateLifecycleStage: z.string().min(1),
  lifecycleNotice: z.string().min(1),
  runLabel: z.string(),
  location: z.string().min(1),
  caseCount: z.number().int().positive(),
  modelConfiguration: z.object({
    productionModel: z.string().min(1),
    fallbackModel: z.string().min(1),
    candidateModel: z.string().min(1),
    candidateUse: z.literal("EVALUATION_ONLY"),
  }).strict(),
  safetyConfiguration: z.object({
    trafficPercentage: z.literal(0),
    publicationEnabled: z.literal(false),
    firestoreWritesEnabled: z.literal(false),
    cloudRunWritesEnabled: z.literal(false),
    rawOutputsEnabled: z.boolean(),
    inputsRedacted: z.boolean(),
  }).strict(),
  requestBudget: z.object({
    maximumRequests: z.number().int().positive(),
    maximumEstimatedInputTokens: z.number().int().positive(),
    maximumEstimatedOutputTokens: z.number().int().positive(),
  }).strict(),
  actualRequestTotals: z.object({
    requests: z.number().int().nonnegative(),
    retries: z.number().int().nonnegative(),
  }).strict(),
  traceabilityMetadata: z.object({
    complete: z.boolean(),
    evaluationId: z.string().regex(/^eval_[a-f0-9]{24}$/),
    caseCount: z.number().int().positive(),
  }).strict(),
  configuration: z.record(z.string(), z.unknown()),
  baselineMetrics: z.unknown(),
  candidateMetrics: z.unknown(),
  comparativeMetrics: z.unknown(),
  promotion: z.object({
    recommendation: z.string(),
    criticalInvariantViolations: z.array(z.string()),
    checks: z.array(z.unknown()),
    integrity: z.string().optional(),
    integrityReasons: z.array(z.string()).optional(),
  }).passthrough(),
  failedCases: z.array(z.string()),
  warningCases: z.array(z.string()),
  missingMetadata: z.array(z.string()),
  recommendation: z.string().nullable(),
  evaluationIntegrity: z.string(),
  evaluationIntegrityReasons: z.array(z.string()),
  caseResults: z.array(z.unknown()),
}).strict().superRefine((report, context) => {
  if (new Date(report.completedAt).getTime() - new Date(report.startedAt).getTime() !== report.durationMs) {
    context.addIssue({ code: "custom", path: ["durationMs"], message: "durationMs must equal completedAt minus startedAt." });
  }
  if (report.integrityClassification !== "VALID" && report.qualityMetricsAdmissibility === "ADMISSIBLE") {
    context.addIssue({ code: "custom", path: ["qualityMetricsAdmissibility"], message: "Invalid integrity cannot make metrics admissible." });
  }
  if (report.integrityClassification !== "VALID" && report.recommendation !== null) {
    context.addIssue({ code: "custom", path: ["recommendation"], message: "Invalid integrity cannot emit a migration recommendation." });
  }
});

export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;

export function gitCommit(repositoryRoot: string) {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim(); } catch { return undefined; }
}

export function markdownReport(report: EvaluationReport) {
  return `# Gemini Migration Evaluation

- Started: ${report.startedAt}
- Completed: ${report.completedAt}
- Duration: ${report.durationMs} ms
- Evaluation ID: ${report.evaluationId}
- Evaluation contract: ${report.evaluationContractVersion}
- Report contract: ${report.reportContractVersion}
- Release manifest: ${report.releaseManifestReference}
- Git revision: ${report.gitRevision}
- Policy / constitution: ${report.policyVersion} / ${report.constitutionVersion}
- Editorial context: ${report.editorialContextVersion}
- Dataset: ${report.datasetVersion} (${report.caseCount} cases)
- Production model: ${report.productionModel}
- Candidate model: ${report.candidateModel}
- Candidate lifecycle stage: ${report.candidateLifecycleStage}
- Lifecycle notice: ${report.lifecycleNotice}
- Run label: ${report.runLabel || "not a real run"}
- SDK: ${report.sdkVersion}
- Recommendation: **${report.recommendation ?? "NONE"}**
- Evaluation integrity: **${report.integrityClassification}**
- Quality metrics: **${report.qualityMetricsAdmissibility}**

## Baseline metrics

\`\`\`json
${JSON.stringify(report.baselineMetrics, null, 2)}
\`\`\`

## Candidate metrics

\`\`\`json
${JSON.stringify(report.candidateMetrics, null, 2)}
\`\`\`

## Comparative metrics

\`\`\`json
${JSON.stringify(report.comparativeMetrics, null, 2)}
\`\`\`

## Raw versus policy-adjusted decisions

The case results retain each model's raw recommendation separately from the deterministic
editorial policy's effective position, action, triggered rules, and human-review requirement.

## Critical invariant violations

${report.promotion.criticalInvariantViolations.length ? report.promotion.criticalInvariantViolations.map((item) => `- ${item}`).join("\n") : "None."}
`;
}

export function csvReport(report: EvaluationReport) {
  type CsvCase = {
    caseId: unknown;
    baseline: { status: unknown; model: unknown; recommendation?: unknown; editorialPolicy?: { effectivePosition?: unknown; action?: unknown } };
    candidate: { status: unknown; model: unknown; recommendation?: unknown; editorialPolicy?: { effectivePosition?: unknown; action?: unknown } };
  };
  const rows = [
    ["#evaluationId", report.evaluationId],
    ["#evaluationContractVersion", report.evaluationContractVersion],
    ["#reportContractVersion", report.reportContractVersion],
    ["#releaseManifestReference", report.releaseManifestReference],
    ["#gitRevision", report.gitRevision],
    ["#policyVersion", report.policyVersion],
    ["#datasetVersion", report.datasetVersion],
    ["#startedAt", report.startedAt],
    ["#completedAt", report.completedAt],
    ["#integrityClassification", report.integrityClassification],
    ["#qualityMetricsAdmissibility", report.qualityMetricsAdmissibility],
    ["caseId", "baselineStatus", "candidateStatus", "baselineModel", "candidateModel", "baselineRawPosition", "candidateRawPosition", "baselineEffectivePosition", "candidateEffectivePosition", "candidatePolicyAction"],
    ...(report.caseResults as CsvCase[]).map((item) => [
      item.caseId, item.baseline.status, item.candidate.status, item.baseline.model, item.candidate.model,
      item.baseline.recommendation ?? "INSUFFICIENT_EVIDENCE",
      item.candidate.recommendation ?? "INSUFFICIENT_EVIDENCE",
      item.baseline.editorialPolicy?.effectivePosition ?? "",
      item.candidate.editorialPolicy?.effectivePosition ?? "",
      item.candidate.editorialPolicy?.action ?? "",
    ]),
  ];
  return rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function writeEvaluationReports(repositoryRoot: string, config: GeminiRuntimeConfig, report: EvaluationReport) {
  const directory = resolve(repositoryRoot, config.evaluation.outputDir);
  await mkdir(directory, { recursive: true });
  const stamp = report.timestamp.replaceAll(/[:.]/g, "-");
  const base = resolve(directory, `${stamp}-gemini-migration`);
  await Promise.all([
    writeFile(`${base}.json`, JSON.stringify(report, null, 2)),
    writeFile(`${base}.md`, markdownReport(report)),
    writeFile(`${base}.csv`, csvReport(report)),
  ]);
  return { json: `${base}.json`, markdown: `${base}.md`, csv: `${base}.csv` };
}

export async function readEvaluationReport(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as EvaluationReport;
}

export function buildEvaluationReport(
  repositoryRoot: string,
  datasetVersion: string,
  config: GeminiRuntimeConfig,
  result: Awaited<ReturnType<typeof import("./evaluation-engine").runEvaluation>>,
): EvaluationReport {
  const caseResults = result.caseResults.map((item) => config.evaluation.saveRawOutputs
    ? {
        ...item,
        baseline: { ...item.baseline, validatedSignal: undefined, validatedDecision: undefined },
        candidate: { ...item.candidate, validatedSignal: undefined, validatedDecision: undefined },
      }
    : {
        ...item,
        baseline: { ...item.baseline, outputText: "[REDACTED]", validatedSignal: undefined, validatedDecision: undefined },
        candidate: { ...item.candidate, outputText: "[REDACTED]", validatedSignal: undefined, validatedDecision: undefined },
      });
  const integrityClassification = result.integrity.integrity;
  const qualityMetricsAdmissibility: QualityMetricsAdmissibility = integrityClassification === "VALID"
    ? "ADMISSIBLE"
    : ["INVALID_HARNESS", "INVALID_REPORT_CONTRACT"].includes(integrityClassification)
      ? "OBSERVATIONAL_ONLY"
      : "UNAVAILABLE";
  const evaluationId = result.caseResults[0]?.traceability?.evaluationId;
  if (!evaluationId) throw new Error("Evaluation report requires a complete evaluation trace identifier.");
  const revision = gitCommit(repositoryRoot);
  if (!revision) throw new Error("Evaluation report requires a Git revision.");
  const traceabilityComplete = result.caseResults.every((item) => item.traceability && Object.keys(item.traceability).length === 7);
  const report = {
    evaluationId,
    evaluationContractVersion: SHADOW_GOVERNANCE_VERSIONS.evaluationVersion,
    reportContractVersion: SHADOW_GOVERNANCE_VERSIONS.reportVersion,
    releaseManifestReference: "release/release-manifest.json" as const,
    gitRevision: revision,
    policyVersion: EDITORIAL_POLICY_CONSTITUTION.policyVersion,
    constitutionVersion: EDITORIAL_POLICY_CONSTITUTION.policyVersion,
    datasetVersion,
    editorialContextVersion: SHADOW_GOVERNANCE_VERSIONS.fixtureVersion,
    startedAt: result.execution.startedAt,
    completedAt: result.execution.completedAt,
    durationMs: result.execution.durationMs,
    integrityClassification,
    qualityMetricsAdmissibility,
    timestamp: result.execution.completedAt,
    sdkVersion: GOOGLE_GENAI_SDK_VERSION,
    productionModel: config.primaryModel,
    candidateModel: config.evaluation.candidateModel,
    candidateLifecycleStage: config.evaluation.candidateStage,
    lifecycleNotice: "Candidate lifecycle stage is operator-supplied, not independently verified.",
    runLabel: config.evaluation.runLabel,
    location: config.location,
    caseCount: result.caseResults.length,
    modelConfiguration: {
      productionModel: config.primaryModel,
      fallbackModel: config.fallbackModel,
      candidateModel: config.evaluation.candidateModel,
      candidateUse: "EVALUATION_ONLY" as const,
    },
    safetyConfiguration: {
      trafficPercentage: 0 as const,
      publicationEnabled: false as const,
      firestoreWritesEnabled: false as const,
      cloudRunWritesEnabled: false as const,
      rawOutputsEnabled: config.evaluation.saveRawOutputs,
      inputsRedacted: config.evaluation.redactInputs,
    },
    requestBudget: {
      maximumRequests: config.evaluation.maxRequests,
      maximumEstimatedInputTokens: config.evaluation.maxEstimatedInputTokens,
      maximumEstimatedOutputTokens: config.evaluation.maxEstimatedOutputTokens,
    },
    actualRequestTotals: {
      requests: result.execution.actualRequestTotal,
      retries: result.execution.retryTotal,
    },
    traceabilityMetadata: {
      complete: traceabilityComplete,
      evaluationId,
      caseCount: result.caseResults.length,
    },
    configuration: {
      concurrency: config.evaluation.concurrency,
      timeoutMs: config.evaluation.timeoutMs,
      maxCases: config.evaluation.maxCases,
      sampleRate: config.evaluation.sampleRate,
      saveRawOutputs: config.evaluation.saveRawOutputs,
      redactInputs: config.evaluation.redactInputs,
      executionWorkflow: result.execution.integratedAvailabilityGate.enabled
        ? "INTEGRATED_FIRST_CASE_GATE"
        : "STANDARD_EVALUATION",
      integratedAvailabilityGate: result.execution.integratedAvailabilityGate,
      duplicateSmokeRequests: 0,
    },
    baselineMetrics: result.baselineMetrics,
    candidateMetrics: result.candidateMetrics,
    comparativeMetrics: result.comparativeMetrics,
    promotion: result.promotion,
    failedCases: result.caseResults.filter((item) => item.candidate.status === "FAILED").map((item) => item.caseId),
    warningCases: result.caseResults.filter((item) => !item.expectationChecks.requiredKeywords || !item.expectationChecks.forbiddenKeywords).map((item) => item.caseId),
    missingMetadata: result.caseResults.filter((item) => item.candidate.signal.totalTokens === undefined).map((item) => item.caseId),
    recommendation: integrityClassification === "VALID" ? result.promotion.recommendation : null,
    evaluationIntegrity: result.integrity.integrity,
    evaluationIntegrityReasons: result.integrity.reasons,
    caseResults,
  };
  return EvaluationReportSchema.parse(report);
}
