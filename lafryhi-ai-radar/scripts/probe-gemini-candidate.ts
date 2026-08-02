import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGeminiRuntimeConfig, type GeminiEnvironment } from "../src/services/gemini-runtime-config";
import { loadEvaluationDataset } from "../src/services/evaluation/dataset-loader";
import { createEvaluationModelRunner } from "../src/services/evaluation/case-runner";
import { runEvaluation } from "../src/services/evaluation/evaluation-engine";
import { assertRealCallGuard, assertSmokeCaseCount, assertUsageWithinLimits } from "../src/services/evaluation/live-safety";
import { probeCandidateLocations } from "../src/services/evaluation/model-availability";
import { buildProbeReport, findLatestSuccessfulProbe, writeProbeReport } from "../src/services/evaluation/probe-report";
import { buildEvaluationReport, writeEvaluationReports } from "../src/services/evaluation/report-writer";

export type ProbeCliMode = "validate" | "dry-run" | "probe" | "smoke";

export class ProbeCliError extends Error {
  constructor(message: string, readonly exitCode: 2 | 3 | 4 | 5) { super(message); }
}

export function probeExitCode(error: unknown): 2 | 3 | 4 | 5 {
  if (error instanceof ProbeCliError) return error.exitCode;
  const message = error instanceof Error ? error.message : String(error);
  return /GEMINI_|GOOGLE_CLOUD_PROJECT|candidate|allowlist|configuration/i.test(message) ? 4 : 5;
}

function safeConfig(mode: ProbeCliMode, env: GeminiEnvironment) {
  return parseGeminiRuntimeConfig(mode === "probe" || mode === "smoke"
    ? env
    : { GOOGLE_CLOUD_PROJECT: "validation-only-not-used", ...env });
}

function credentialsAppearAvailable(env: GeminiEnvironment) {
  if (env.GOOGLE_APPLICATION_CREDENTIALS) return existsSync(env.GOOGLE_APPLICATION_CREDENTIALS);
  const appData = env.APPDATA;
  return Boolean(appData && existsSync(resolve(appData, "gcloud", "application_default_credentials.json")));
}

export async function executeProbeCli(
  mode: ProbeCliMode,
  env: GeminiEnvironment = process.env,
  repositoryRoot = process.cwd(),
) {
  const config = safeConfig(mode, env);
  const readiness = {
    candidateConfigured: Boolean(config.evaluation.candidateModel),
    allowlisted: Boolean(config.evaluation.candidateModel && config.evaluation.allowedModels.includes(config.evaluation.candidateModel)),
    productionCandidateRejected: config.evaluation.candidateModel !== config.primaryModel,
    projectConfigured: Boolean(env.GOOGLE_CLOUD_PROJECT),
  };
  if (config.evaluation.candidateModel && config.evaluation.candidateModel === config.primaryModel) {
    throw new Error("The production model cannot be used as the candidate.");
  }
  if (config.evaluation.candidateModel && !readiness.allowlisted) {
    throw new Error("Candidate must exactly match GEMINI_EVALUATION_ALLOWED_MODELS. Evaluation allowlist approval is not production approval.");
  }
  if (mode === "validate") return { mode, readiness, locations: config.evaluation.probeLocations, lifecycleStage: config.evaluation.candidateStage, modelCalls: 0 };
  const sanitized = {
    candidate: config.evaluation.candidateModel || "[not configured]",
    locations: config.evaluation.probeLocations,
    lifecycleStage: config.evaluation.candidateStage,
    timeoutMs: config.evaluation.timeoutMs,
    maxOutputTokens: 128,
    credentialsAppearAvailable: credentialsAppearAvailable(env),
    maxRequests: config.evaluation.maxRequests,
    maxEstimatedInputTokens: config.evaluation.maxEstimatedInputTokens,
    maxEstimatedOutputTokens: config.evaluation.maxEstimatedOutputTokens,
    notice: "Evaluation allowlist approval is not production approval.",
    saveResponsePrefix: config.evaluation.probeSaveResponsePrefix,
    jsonRetry: config.evaluation.probeJsonRetry,
  };
  if (mode === "dry-run") return { mode, configuration: sanitized, modelCalls: 0 };

  assertRealCallGuard(config);
  if (!env.GOOGLE_CLOUD_PROJECT) throw new Error("GOOGLE_CLOUD_PROJECT must be explicitly configured for real calls.");
  if (mode === "probe") {
    const modesPerLocation = 1 + (config.evaluation.probeThinking ? 1 : 0) + (config.evaluation.probeJsonRetry ? 1 : 0);
    const plannedRequests = config.evaluation.probeLocations.length * 2 * modesPerLocation;
    assertUsageWithinLimits(config, { requests: plannedRequests, estimatedInputTokens: plannedRequests * 64, estimatedOutputTokens: plannedRequests * 128 });
    console.warn("WARNING: The candidate probe will make small billable Vertex AI calls. Evaluation allowlist approval is not production approval.");
    const results = await probeCandidateLocations({
      projectId: config.project,
      locations: config.evaluation.probeLocations,
      candidateModel: config.evaluation.candidateModel,
      timeoutMs: config.evaluation.timeoutMs,
      dryRun: false,
      probeThinking: config.evaluation.probeThinking,
      thinkingMode: config.thinkingMode,
      saveResponsePrefix: config.evaluation.probeSaveResponsePrefix,
      jsonRetry: config.evaluation.probeJsonRetry,
      requestBudget: config.evaluation.maxRequests,
    });
    const report = buildProbeReport(repositoryRoot, config, results);
    const files = await writeProbeReport(repositoryRoot, config, report);
    if (report.availabilityStatus === "REACHABLE_BUT_CONTRACT_FAILED") {
      throw new ProbeCliError(
        "Candidate is reachable in at least one location, but failed the strict structured-output compatibility probe. Do not run the smoke evaluation.",
        2,
      );
    }
    if (report.availabilityStatus === "UNAVAILABLE") {
      throw new ProbeCliError(`Candidate unavailable in all configured locations. Probe report: ${files.json}`, 3);
    }
    if (report.availabilityStatus === "UNKNOWN_OR_ACCESS_FAILURE") {
      throw new ProbeCliError(`Candidate availability is unknown due to access or configuration failure. Probe report: ${files.json}`, 4);
    }
    return { mode, files, status: report.availabilityStatus, modelCalls: results.reduce((sum, item) => sum + item.attempts, 0) };
  }

  await findLatestSuccessfulProbe(repositoryRoot, config);
  const dataset = await loadEvaluationDataset(repositoryRoot, { ...config.evaluation, maxCases: 0, sampleRate: 1 });
  const maxCasesExplicit = env.GEMINI_EVALUATION_MAX_CASES !== undefined;
  const selectedCases = maxCasesExplicit
    ? dataset.cases.slice(0, config.evaluation.maxCases)
    : dataset.cases.filter((item) => item.smokeTest);
  assertSmokeCaseCount(config, selectedCases.length, maxCasesExplicit);
  const requests = selectedCases.length * 4;
  assertUsageWithinLimits(config, {
    requests,
    estimatedInputTokens: selectedCases.reduce((sum, item) => sum + Math.ceil(item.source.content.length / 4) * 4, 0),
    estimatedOutputTokens: requests * 1_250,
  });
  console.warn("WARNING: The smoke comparison will make billable Vertex AI calls for the selected cases.");
  const result = await runEvaluation({ ...dataset, cases: selectedCases }, config, createEvaluationModelRunner(config));
  const report = buildEvaluationReport(repositoryRoot, dataset.datasetVersion, config, result);
  const files = await writeEvaluationReports(repositoryRoot, config, report);
  return { mode, files, caseCount: selectedCases.length, modelCalls: requests };
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const mode = (process.argv[2] ?? "validate") as ProbeCliMode;
  executeProbeCli(mode)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = probeExitCode(error);
    });
}
