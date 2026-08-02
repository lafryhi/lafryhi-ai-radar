import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { GeminiRuntimeConfig } from "../gemini-runtime-config";
import { GOOGLE_GENAI_SDK_VERSION } from "../gemini-runtime-config";
import type { CandidateAvailabilityResult } from "./model-availability";
import { gitCommit } from "./report-writer";

export interface CandidateProbeReport {
  runLabel: string;
  timestamp: string;
  gitCommit?: string;
  sdkVersion: string;
  candidateModel: string;
  candidateLifecycleStage: string;
  lifecycleNotice: string;
  productionModel: string;
  attemptedLocations: string[];
  successfulLocations: string[];
  results: CandidateAvailabilityResult[];
  realCallsEnabled: boolean;
  availabilityStatus: "AVAILABLE_FOR_EVALUATION" | "REACHABLE_BUT_CONTRACT_FAILED" | "UNAVAILABLE" | "UNKNOWN_OR_ACCESS_FAILURE";
  noDeploymentOccurred: true;
  productionConfigurationUnchanged: true;
}

export function overallProbeStatus(results: CandidateAvailabilityResult[]): CandidateProbeReport["availabilityStatus"] {
  if (results.some((item) => item.availabilityStatus === "AVAILABLE_AND_COMPATIBLE")) return "AVAILABLE_FOR_EVALUATION";
  if (results.some((item) => item.availabilityStatus === "AVAILABLE_CONTRACT_INCOMPATIBLE")) return "REACHABLE_BUT_CONTRACT_FAILED";
  if (results.length > 0 && results.every((item) => item.transportStatus === "MODEL_NOT_FOUND")) return "UNAVAILABLE";
  return "UNKNOWN_OR_ACCESS_FAILURE";
}

export function buildProbeReport(
  repositoryRoot: string,
  config: GeminiRuntimeConfig,
  results: CandidateAvailabilityResult[],
): CandidateProbeReport {
  return {
    runLabel: config.evaluation.runLabel,
    timestamp: new Date().toISOString(),
    gitCommit: gitCommit(repositoryRoot),
    sdkVersion: GOOGLE_GENAI_SDK_VERSION,
    candidateModel: config.evaluation.candidateModel,
    candidateLifecycleStage: config.evaluation.candidateStage,
    lifecycleNotice: "Candidate lifecycle stage is operator-supplied, not independently verified.",
    productionModel: config.primaryModel,
    attemptedLocations: results.map((item) => item.location),
    successfulLocations: results.filter((item) => item.availabilityStatus === "AVAILABLE_AND_COMPATIBLE").map((item) => item.location),
    results,
    realCallsEnabled: config.evaluation.allowRealCalls,
    availabilityStatus: overallProbeStatus(results),
    noDeploymentOccurred: true,
    productionConfigurationUnchanged: true,
  };
}

export function probeMarkdown(report: CandidateProbeReport) {
  return `# Gemini Candidate Availability Probe

- Run label: ${report.runLabel}
- Timestamp: ${report.timestamp}
- Production model: ${report.productionModel}
- Candidate model: ${report.candidateModel}
- Candidate lifecycle stage: ${report.candidateLifecycleStage}
- Lifecycle notice: ${report.lifecycleNotice}
- SDK version: ${report.sdkVersion}
- Attempted locations: ${report.attemptedLocations.join(", ")}
- Successful locations: ${report.successfulLocations.join(", ") || "none"}
- Status: **${report.availabilityStatus}**
- Real calls enabled: ${report.realCallsEnabled}
- No deployment occurred: yes
- Production configuration unchanged: yes

Successful availability means only AVAILABLE_FOR_EVALUATION. It does not mean production approval or canary eligibility.
`;
}

export async function writeProbeReport(repositoryRoot: string, config: GeminiRuntimeConfig, report: CandidateProbeReport) {
  const directory = resolve(repositoryRoot, config.evaluation.outputDir, "probes");
  await mkdir(directory, { recursive: true });
  const base = resolve(directory, `${report.timestamp.replaceAll(/[:.]/g, "-")}-${report.runLabel}-probe`);
  await Promise.all([
    writeFile(`${base}.json`, JSON.stringify(report, null, 2)),
    writeFile(`${base}.md`, probeMarkdown(report)),
  ]);
  return { json: `${base}.json`, markdown: `${base}.md` };
}

export async function findLatestSuccessfulProbe(repositoryRoot: string, config: GeminiRuntimeConfig) {
  const directory = resolve(repositoryRoot, config.evaluation.outputDir, "probes");
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort().reverse();
  for (const name of files) {
    const report = JSON.parse(await readFile(resolve(directory, name), "utf8")) as CandidateProbeReport;
    if (report.candidateModel === config.evaluation.candidateModel && report.availabilityStatus === "AVAILABLE_FOR_EVALUATION") return report;
  }
  throw new Error("A successful probe report for the configured candidate is required before smoke evaluation.");
}
