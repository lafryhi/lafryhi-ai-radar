import type { GeminiRuntimeConfig } from "../gemini-runtime-config";
import { compareCase, evaluatePromotion } from "./comparator";
import { calculateComparativeMetrics, calculateModelMetrics } from "./metrics";
import { redactCaseSource } from "./redaction";
import type { EvaluationCase, EvaluationCaseResult, EvaluationDataset } from "./types";
import type { EvaluationModelRunner } from "./case-runner";
import { assessEvaluationIntegrity } from "./integrity";
import { createTraceabilityIdentifiers } from "../release-governance";
import { VertexRequestBudgetExceeded } from "./live-safety";

export const EVALUATION_SIDE_EFFECT_CAPABILITIES = Object.freeze({
  firestoreWrites: false,
  publicationCalls: false,
  cookieWrites: false,
  sessionWrites: false,
  publicApiExposure: false,
});

export interface EvaluationRunOptions {
  integratedAvailabilityGate?: boolean;
}

export class IntegratedAvailabilityGateError extends Error {
  constructor(readonly reasons: string[]) {
    super(`Integrated availability gate failed: ${reasons.join("; ")}`);
    this.name = "IntegratedAvailabilityGateError";
  }
}

export function integratedAvailabilityGateFailures(result: EvaluationCaseResult) {
  const failures: string[] = [];
  for (const [role, model] of [["baseline", result.baseline], ["candidate", result.candidate]] as const) {
    if (!model.pipelineCompleted) failures.push(`${role}: pipeline did not complete`);
    if (!model.decision) failures.push(`${role}: Decision Intelligence was not exercised`);
    for (const [stageName, stage] of [["signal", model.signal], ["decision", model.decision]] as const) {
      if (!stage) continue;
      if (!stage.transportSuccess) failures.push(`${role}/${stageName}: transport failed`);
      if (!stage.responseReceived) failures.push(`${role}/${stageName}: response was not received`);
      if (!stage.requestSucceeded) failures.push(`${role}/${stageName}: request failed`);
      if (!stage.jsonParsed) failures.push(`${role}/${stageName}: JSON parsing failed`);
      if (!stage.schemaValid) failures.push(`${role}/${stageName}: schema validation failed`);
      if (!stage.applicationValid) failures.push(`${role}/${stageName}: application validation failed`);
      if (!stage.exactQuoteValid) failures.push(`${role}/${stageName}: exact-evidence validation failed`);
      if (!stage.evidenceIdsValid) failures.push(`${role}/${stageName}: evidence-ID validation failed`);
      if (stage.fallbackUsed) failures.push(`${role}/${stageName}: fallback leakage detected`);
    }
  }
  if (!result.candidate.editorialPolicy) failures.push("candidate: editorial policy was not evaluated");
  if (result.expectationChecks.forbiddenTermDetectorAgreement !== true) failures.push("canonical forbidden-term adjudication disagreed");
  if (result.invariantViolations.length) failures.push(...result.invariantViolations.map((item) => `invariant: ${item}`));
  return failures;
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, operation: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await operation(items[index]);
    }
  }));
  return results;
}

export async function runEvaluation(
  dataset: EvaluationDataset,
  config: GeminiRuntimeConfig,
  runner: EvaluationModelRunner,
  options: EvaluationRunOptions = {},
) {
  const startedAt = new Date();
  if (!config.evaluation.enabled) throw new Error("Gemini evaluation is disabled.");
  const runCase = async (testCase: EvaluationCase) => {
    const baseline = await runner(testCase, config.primaryModel);
    let candidate;
    try {
      candidate = await runner(testCase, config.evaluation.candidateModel);
    } catch (error) {
      if (error instanceof VertexRequestBudgetExceeded) throw error;
      candidate = {
        ...baseline,
        model: config.evaluation.candidateModel,
        pipelineCompleted: false,
        status: "FAILED" as const,
        outputText: "",
      };
    }
    const compared = compareCase(testCase, baseline, candidate);
    return redactCaseSource({
      ...compared,
      traceability: createTraceabilityIdentifiers(
        config.evaluation.runLabel || "local-evaluation-without-real-calls",
        testCase.id,
      ),
    }, config.evaluation.redactInputs);
  };
  let caseResults: EvaluationCaseResult[];
  let gateResult: { enabled: boolean; caseId?: string; passed?: boolean; requestAllocation: number };
  if (options.integratedAvailabilityGate) {
    const [firstCase, ...remainingCases] = dataset.cases;
    if (!firstCase) throw new Error("Integrated availability gate requires a dataset case.");
    const firstResult = await runCase(firstCase);
    const failures = integratedAvailabilityGateFailures(firstResult);
    if (failures.length) throw new IntegratedAvailabilityGateError(failures);
    const remainingResults = await mapConcurrent(remainingCases, config.evaluation.concurrency, runCase);
    caseResults = [firstResult, ...remainingResults];
    gateResult = { enabled: true, caseId: firstCase.id, passed: true, requestAllocation: 4 };
  } else {
    caseResults = await mapConcurrent(dataset.cases, config.evaluation.concurrency, runCase);
    gateResult = { enabled: false, requestAllocation: 0 };
  }
  const expected = dataset.cases.map((item) => item.expectations.mustReturnInsufficientEvidence);
  const baselineMetrics = calculateModelMetrics(caseResults.map((item) => item.baseline), expected);
  const candidateMetrics = calculateModelMetrics(caseResults.map((item) => item.candidate), expected);
  const comparativeMetrics = calculateComparativeMetrics(caseResults);
  const criticalInvariantViolations = caseResults.flatMap((item) => item.invariantViolations);
  const integrity = assessEvaluationIntegrity(dataset.cases, caseResults);
  const promotion = evaluatePromotion(
    baselineMetrics, candidateMetrics, comparativeMetrics, criticalInvariantViolations,
    config.evaluation.candidateStage, integrity.integrity, integrity.reasons,
  );
  const completedAt = new Date();
  const stageResults = caseResults.flatMap((item) => [
    item.baseline.signal,
    ...(item.baseline.decision ? [item.baseline.decision] : []),
    item.candidate.signal,
    ...(item.candidate.decision ? [item.candidate.decision] : []),
  ]);
  return {
    caseResults,
    baselineMetrics,
    candidateMetrics,
    comparativeMetrics,
    promotion,
    integrity,
    execution: {
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      actualRequestTotal: stageResults.reduce((sum, stage) => sum + stage.attempts, 0),
      retryTotal: stageResults.reduce((sum, stage) => sum + Math.max(0, stage.attempts - 1), 0),
      integratedAvailabilityGate: gateResult,
    },
  };
}
