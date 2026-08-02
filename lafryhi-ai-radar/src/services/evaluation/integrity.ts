import type { EvaluationCase, EvaluationCaseResult, EvaluationIntegrity } from "./types";
import { normalizedKeywordMatch } from "./keyword-matching";

export const INTEGRITY_PRECEDENCE: EvaluationIntegrity[] = [
  "INVALID_CONFIGURATION",
  "INVALID_DATASET",
  "INVALID_DATASET_EXPECTATION",
  "INVALID_CONTRACT",
  "INVALID_REPORT_CONTRACT",
  "INVALID_HARNESS",
  "INCONCLUSIVE_PROVIDER_FAILURE",
  "INCONCLUSIVE_BUDGET_STOP",
  "INCONCLUSIVE_OTHER",
  "INCONCLUSIVE",
  "VALID",
];

export function resolveIntegrity(findings: Array<{ integrity: EvaluationIntegrity; reasons: string[] }>) {
  for (const integrity of INTEGRITY_PRECEDENCE) {
    const matching = findings.filter((finding) => finding.integrity === integrity);
    if (matching.length) return { integrity, reasons: matching.flatMap((finding) => finding.reasons) };
  }
  return { integrity: "VALID" as const, reasons: [] };
}

export function assessEvaluationIntegrity(
  cases: EvaluationCase[],
  results: EvaluationCaseResult[],
): { integrity: EvaluationIntegrity; reasons: string[] } {
  const datasetProblems = cases.flatMap((testCase) => {
    const requirements = [
      ...testCase.expectations.requiredKeywords.map((keyword) => [keyword]),
      ...testCase.expectations.requiredKeywordAlternatives,
    ];
    return requirements.some((alternatives) => !alternatives.some((keyword) => normalizedKeywordMatch(testCase.source.content, keyword)))
      ? [`${testCase.id}: required keyword expectation is absent from the synthetic source`]
      : [];
  });
  if (datasetProblems.length) return { integrity: "INVALID_DATASET_EXPECTATION", reasons: datasetProblems };

  const harnessProblems = results.flatMap((result) => [result.baseline, result.candidate].flatMap((model) => {
    const stages = model.decision ? [model.signal, model.decision] : [model.signal];
    return stages.flatMap((stage) => {
      const inconsistent = [
        !stage.requestSucceeded && stage.responseReceived ? "response recorded after failed request" : "",
        stage.schemaValid && !stage.jsonParsed ? "schema valid without parsed JSON" : "",
        stage.applicationValid && !stage.schemaValid ? "application valid without schema validity" : "",
        stage.failedStage === "HARNESS" ? "explicit harness failure" : "",
      ].filter(Boolean);
      return inconsistent.map((message) => `${result.caseId}/${model.model}: ${message}`);
    });
  }));
  results.forEach((result) => {
    if (result.expectationChecks.forbiddenTermDetectorAgreement === false) {
      harnessProblems.push(`${result.caseId}: forbidden-term consumers disagreed`);
    }
  });
  if (harnessProblems.length) return { integrity: "INVALID_HARNESS", reasons: harnessProblems };

  const comparable = results.some((result) => result.baseline.pipelineCompleted && result.candidate.pipelineCompleted);
  if (!comparable) return { integrity: "INCONCLUSIVE", reasons: ["No case completed for both baseline and candidate."] };
  return { integrity: "VALID", reasons: [] };
}
