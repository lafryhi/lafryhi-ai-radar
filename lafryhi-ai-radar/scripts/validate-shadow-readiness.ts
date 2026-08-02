import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createTraceabilityIdentifiers, ReleaseManifestSchema, SHADOW_GOVERNANCE_VERSIONS } from "../src/services/release-governance";
import { assertShadowReady } from "../src/services/shadow-readiness";

async function json(path: string) {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8")) as unknown;
}

async function main() {
  const manifest = ReleaseManifestSchema.parse(await json("release/release-manifest.json"));
  const checklist = assertShadowReady({
    repositoryRoot: process.cwd(),
    productionModel: manifest.approvedProductionModel,
    fallbackModel: manifest.approvedProductionModel,
    candidateModel: manifest.candidateModel,
    candidateUse: manifest.candidateUse,
    trafficPercentage: 0,
    publicationEnabled: false,
    cloudRunWriteEnabled: false,
    firestoreWriteEnabled: false,
    reportDestination: "eval/results/shadow",
    rawOutputsEnabled: false,
    inputsRedacted: true,
    reviewPipelineEnabled: true,
    dataset: await json("eval/datasets/gemini-migration.json"),
    editorialPolicyConstitution: await json("config/editorial-policy.v1.1.json"),
    versions: SHADOW_GOVERNANCE_VERSIONS,
    traceabilitySample: createTraceabilityIdentifiers("phase-4-certification", "official-google-announcement"),
    generatedAt: manifest.releaseTimestamp,
  });
  console.log(JSON.stringify({
    status: checklist.overallStatus,
    requirements: checklist.requirements.length,
    failed: checklist.requirements.filter((item) => item.status === "FAIL").map((item) => item.id),
    modelCalls: 0,
    deploymentActions: 0,
    productionModel: checklist.approvedProductionModel,
    candidateUse: "EVALUATION_ONLY",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
