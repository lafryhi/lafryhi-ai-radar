import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ReleaseManifestSchema, validateShadowVersionCompatibility } from "../release-governance";
import { resolveIntegrity } from "./integrity";
import { EvaluationReportSchema } from "./report-writer";
import type { EvaluationIntegrity, QualityMetricsAdmissibility } from "./types";

type LegacyReport = Record<string, unknown> & {
  caseResults?: Array<Record<string, unknown>>;
  comparativeMetrics?: Record<string, unknown>;
  recommendation?: unknown;
};

function reportContractReasons(report: LegacyReport) {
  const required = [
    "evaluationId", "evaluationContractVersion", "reportContractVersion", "releaseManifestReference",
    "gitRevision", "policyVersion", "constitutionVersion", "datasetVersion", "editorialContextVersion",
    "startedAt", "completedAt", "durationMs", "integrityClassification", "modelConfiguration",
    "location", "traceabilityMetadata", "safetyConfiguration", "requestBudget", "actualRequestTotals",
    "qualityMetricsAdmissibility",
  ];
  return required.filter((field) => report[field] === undefined).map((field) => `missing mandatory report field: ${field}`);
}

function traceabilityReasons(report: LegacyReport) {
  const cases = report.caseResults ?? [];
  const required = ["evaluationId", "caseId", "signalId", "decisionId", "policyId", "reviewId", "publicationId"];
  return cases.flatMap((item) => {
    const trace = item.traceability as Record<string, unknown> | undefined;
    return !trace || required.some((field) => typeof trace[field] !== "string")
      ? [`${String(item.caseId ?? "unknown")}: incomplete traceability chain`]
      : [];
  });
}

function actualRequests(report: LegacyReport) {
  return (report.caseResults ?? []).reduce((total, item) => {
    const modelRequests = ["baseline", "candidate"].reduce((modelTotal, role) => {
      const model = item[role] as Record<string, unknown> | undefined;
      if (!model) return modelTotal;
      return modelTotal + ["signal", "decision"].reduce((stageTotal, stageName) => {
        const stage = model[stageName] as Record<string, unknown> | undefined;
        return stageTotal + (typeof stage?.attempts === "number" ? stage.attempts : 0);
      }, 0);
    }, 0);
    return total + modelRequests;
  }, 0);
}

export async function forensicValidateReport(reportPath: string, repositoryRoot = process.cwd()) {
  const absolute = resolve(repositoryRoot, reportPath);
  const report = JSON.parse(await readFile(absolute, "utf8")) as LegacyReport;
  const findings: Array<{ integrity: EvaluationIntegrity; reasons: string[] }> = [];
  const contract = EvaluationReportSchema.safeParse(report);
  if (!contract.success) {
    const reasons = reportContractReasons(report);
    findings.push({
      integrity: "INVALID_REPORT_CONTRACT",
      reasons: reasons.length ? reasons : contract.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    });
  }
  const traces = traceabilityReasons(report);
  if (traces.length) findings.push({ integrity: "INVALID_CONTRACT", reasons: traces });

  const comparative = report.comparativeMetrics ?? {};
  if (
    typeof comparative.forbiddenKeywordViolationRate === "number"
    && comparative.forbiddenKeywordViolationRate > 0
    && comparative.forbiddenTermDetectionRate === 0
  ) {
    findings.push({
      integrity: "INVALID_HARNESS",
      reasons: ["forbidden-term expectation and Editorial Policy detector disagree, and retained evidence cannot adjudicate the difference"],
    });
  }

  if (contract.success) {
    const manifestPath = resolve(repositoryRoot, contract.data.releaseManifestReference);
    try {
      const manifest = ReleaseManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
      validateShadowVersionCompatibility({
        datasetVersion: contract.data.datasetVersion,
        fixtureVersion: contract.data.editorialContextVersion,
        policyVersion: contract.data.policyVersion,
        constitutionVersion: contract.data.constitutionVersion,
        evaluationVersion: contract.data.evaluationContractVersion,
        reportVersion: contract.data.reportContractVersion,
      });
      if (manifest.gitRevision !== contract.data.gitRevision) {
        findings.push({ integrity: "INVALID_REPORT_CONTRACT", reasons: ["release manifest Git revision does not match report"] });
      }
    } catch (error) {
      findings.push({ integrity: "INVALID_REPORT_CONTRACT", reasons: [error instanceof Error ? error.message : "release manifest validation failed"] });
    }
    if (actualRequests(report) !== contract.data.actualRequestTotals.requests) {
      findings.push({ integrity: "INVALID_REPORT_CONTRACT", reasons: ["actual request total does not match stage attempts"] });
    }
  }

  const resolved = resolveIntegrity(findings.length ? findings : [{ integrity: "VALID", reasons: [] }]);
  const admissibility: QualityMetricsAdmissibility = resolved.integrity === "VALID"
    ? "ADMISSIBLE"
    : ["INVALID_HARNESS", "INVALID_REPORT_CONTRACT"].includes(resolved.integrity)
      ? "OBSERVATIONAL_ONLY"
      : "UNAVAILABLE";
  return {
    reportPath,
    integrityClassification: resolved.integrity,
    reasons: resolved.reasons,
    allFindings: findings,
    qualityMetricsAdmissibility: admissibility,
    migrationRecommendationPermitted: resolved.integrity === "VALID",
    modelCalls: 0,
    infrastructureWrites: 0,
  };
}
