import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGeminiRuntimeConfig, type GeminiEnvironment } from "../src/services/gemini-runtime-config";
import { loadEvaluationDataset } from "../src/services/evaluation/dataset-loader";
import { createEvaluationModelRunner } from "../src/services/evaluation/case-runner";
import { runEvaluation } from "../src/services/evaluation/evaluation-engine";
import {
  assertRealCallGuard,
  assertSmokeCaseCount,
  assertUsageWithinLimits,
  integratedShadowRequestPlan,
} from "../src/services/evaluation/live-safety";
import {
  buildEvaluationReport,
  csvReport,
  markdownReport,
  readEvaluationReport,
  writeEvaluationReports,
} from "../src/services/evaluation/report-writer";

export type EvaluationCliMode = "validate" | "dry-run" | "run" | "report";

function environmentForSafeMode(mode: EvaluationCliMode, env: GeminiEnvironment) {
  return mode === "run" ? env : { GOOGLE_CLOUD_PROJECT: "validation-only-not-used", ...env };
}

export async function executeEvaluationCli(
  mode: EvaluationCliMode,
  env: GeminiEnvironment = process.env,
  repositoryRoot = process.cwd(),
  reportPath?: string,
) {
  if (mode === "report") {
    if (!reportPath) throw new Error("Provide an existing JSON report path.");
    const report = await readEvaluationReport(resolve(repositoryRoot, reportPath));
    return { mode, markdown: markdownReport(report), csv: csvReport(report), modelCalls: 0 };
  }

  const config = parseGeminiRuntimeConfig(environmentForSafeMode(mode, env));
  const dataset = await loadEvaluationDataset(repositoryRoot, config.evaluation);
  if (mode === "validate") {
    return { mode, datasetVersion: dataset.datasetVersion, caseCount: dataset.cases.length, modelCalls: 0 };
  }
  const sanitizedConfiguration = {
    enabled: config.evaluation.enabled,
    productionModel: config.primaryModel,
    candidateConfigured: Boolean(config.evaluation.candidateModel),
    datasetPath: config.evaluation.datasetPath,
    outputDir: config.evaluation.outputDir,
    concurrency: config.evaluation.concurrency,
    sampleRate: config.evaluation.sampleRate,
    redactInputs: config.evaluation.redactInputs,
  };
  const requestPlan = integratedShadowRequestPlan(dataset.cases.length);
  if (mode === "dry-run") {
    return {
      mode,
      selectedCaseIds: dataset.cases.map((item) => item.id),
      configuration: sanitizedConfiguration,
      requestPlan,
      modelCalls: 0,
    };
  }
  assertRealCallGuard(config);
  assertSmokeCaseCount(config, dataset.cases.length, env.GEMINI_EVALUATION_MAX_CASES !== undefined);
  assertUsageWithinLimits(config, {
    requests: requestPlan.requests,
    estimatedInputTokens: dataset.cases.reduce((sum, item) => sum + Math.ceil(item.source.content.length / 4) * 4, 0),
    estimatedOutputTokens: requestPlan.estimatedOutputTokens,
  });
  console.warn("Evaluation allowlist approval is not production approval.");
  console.warn("WARNING: Case 1 is the integrated availability gate; its requests are reused and no separate smoke is performed.");
  console.warn("WARNING: Local evaluation will make billable Vertex AI calls. Results are isolated and never published.");
  const result = await runEvaluation(dataset, config, createEvaluationModelRunner(config), {
    integratedAvailabilityGate: true,
  });
  const report = buildEvaluationReport(repositoryRoot, dataset.datasetVersion, config, result);
  const files = await writeEvaluationReports(repositoryRoot, config, report);
  return {
    mode,
    files,
    recommendation: report.recommendation,
    modelCalls: requestPlan.logicalModelCaseExecutions,
    requestPlan,
  };
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const mode = (process.argv[2] ?? "validate") as EvaluationCliMode;
  executeEvaluationCli(mode, process.env, process.cwd(), process.argv[3])
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
