import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import constitution from "../../config/editorial-policy.v1.1.json";
import dataset from "../../eval/datasets/gemini-migration.json";
import checklistArtifact from "../../release/shadow-readiness.json";
import manifestArtifact from "../../release/release-manifest.json";
import riskArtifact from "../../release/risk-register.json";
import {
  APPROVED_PRODUCTION_MODEL,
  ReleaseManifestSchema,
  RiskRegisterSchema,
  SHADOW_GOVERNANCE_VERSIONS,
  ShadowReadinessChecklistSchema,
  TraceabilityIdentifiersSchema,
  buildReleaseManifest,
  createTraceabilityIdentifiers,
  validateShadowVersionCompatibility,
} from "./release-governance";
import { assertShadowReady, validateShadowReadiness, type ShadowReadinessInput } from "./shadow-readiness";

const repositoryRoot = resolve(__dirname, "../..");
const generatedAt = "2026-07-30T12:30:00.000Z";
const traceabilitySample = createTraceabilityIdentifiers("phase-4-certification", "official-google-announcement");

function input(overrides: Partial<ShadowReadinessInput> = {}): ShadowReadinessInput {
  return {
    repositoryRoot,
    productionModel: APPROVED_PRODUCTION_MODEL,
    fallbackModel: APPROVED_PRODUCTION_MODEL,
    candidateModel: "gemini-3.1-flash-lite",
    candidateUse: "EVALUATION_ONLY",
    trafficPercentage: 0,
    publicationEnabled: false,
    cloudRunWriteEnabled: false,
    firestoreWriteEnabled: false,
    reportDestination: "eval/results/shadow",
    rawOutputsEnabled: false,
    inputsRedacted: true,
    reviewPipelineEnabled: true,
    dataset,
    editorialPolicyConstitution: constitution,
    versions: SHADOW_GOVERNANCE_VERSIONS,
    traceabilitySample,
    generatedAt,
    ...overrides,
  };
}

describe("controlled shadow readiness certification", () => {
  it("passes the reviewed zero-side-effect configuration", () => {
    const result = assertShadowReady(input());
    expect(result.overallStatus).toBe("READY");
    expect(result.requirements).toHaveLength(13);
    expect(result.requirements.every((requirement) => requirement.status === "PASS")).toBe(true);
  });

  it.each([
    ["production model", { productionModel: "candidate" }, "SR-001"],
    ["candidate isolation", { candidateUse: "PRODUCTION" as const }, "SR-002"],
    ["traffic", { trafficPercentage: 1 }, "SR-003"],
    ["publication", { publicationEnabled: true }, "SR-004"],
    ["Cloud Run writes", { cloudRunWriteEnabled: true }, "SR-005"],
    ["Firestore writes", { firestoreWriteEnabled: true }, "SR-006"],
    ["review pipeline", { reviewPipelineEnabled: false }, "SR-009"],
  ])("blocks before model execution when %s protection fails", (_name, override, id) => {
    const result = validateShadowReadiness(input(override));
    expect(result.overallStatus).toBe("BLOCKED");
    expect(result.requirements.find((item) => item.id === id)?.status).toBe("FAIL");
    expect(() => assertShadowReady(input(override))).toThrow(/before model execution/);
  });

  it("rejects absolute and traversal report destinations", () => {
    expect(validateShadowReadiness(input({ reportDestination: "../outside" })).overallStatus).toBe("BLOCKED");
    expect(validateShadowReadiness(input({ reportDestination: "C:\\outside" })).overallStatus).toBe("BLOCKED");
  });

  it("rejects invalid datasets, policies, and incompatible versions", () => {
    expect(validateShadowReadiness(input({ dataset: { datasetVersion: "2.0" } })).overallStatus).toBe("BLOCKED");
    expect(validateShadowReadiness(input({ editorialPolicyConstitution: { policyVersion: "invalid" } })).overallStatus).toBe("BLOCKED");
    expect(validateShadowReadiness(input({
      versions: { ...SHADOW_GOVERNANCE_VERSIONS, reportVersion: "report-v2" },
    })).overallStatus).toBe("BLOCKED");
  });

  it("validates exact version compatibility and rejects mixed policy versions", () => {
    expect(validateShadowVersionCompatibility(SHADOW_GOVERNANCE_VERSIONS)).toEqual(SHADOW_GOVERNANCE_VERSIONS);
    expect(() => validateShadowVersionCompatibility({
      ...SHADOW_GOVERNANCE_VERSIONS,
      constitutionVersion: "editorial-policy-v1",
    })).toThrow();
  });

  it("creates deterministic unique traceability identifiers for the full decision chain", () => {
    const repeated = createTraceabilityIdentifiers("run", "case");
    expect(repeated).toEqual(createTraceabilityIdentifiers("run", "case"));
    expect(TraceabilityIdentifiersSchema.parse(repeated)).toEqual(repeated);
    expect(new Set(Object.values(repeated)).size).toBe(7);
    expect(createTraceabilityIdentifiers("run", "other").evaluationId).toBe(repeated.evaluationId);
    expect(createTraceabilityIdentifiers("run", "other").caseId).not.toBe(repeated.caseId);
  });

  it("validates the committed readiness checklist, risk register, and release manifest", () => {
    expect(ShadowReadinessChecklistSchema.parse(checklistArtifact).overallStatus).toBe("READY");
    expect(RiskRegisterSchema.parse(riskArtifact).risks).toHaveLength(11);
    expect(ReleaseManifestSchema.parse(manifestArtifact).approvedProductionModel).toBe("gemini-2.5-flash");
    expect(JSON.stringify(manifestArtifact)).not.toMatch(/private_key|access_token|client_secret/i);
  });

  it("generates a secret-free evaluation-only release manifest", () => {
    const manifest = buildReleaseManifest({
      gitRevision: "a".repeat(40),
      tests: 240,
      testFiles: 26,
      candidateModel: "candidate",
      releaseTimestamp: generatedAt,
      knownLimitations: ["Synthetic evidence only."],
      knownRisks: ["RISK-005"],
    });
    expect(manifest).toMatchObject({
      approvedProductionModel: "gemini-2.5-flash",
      candidateUse: "EVALUATION_ONLY",
      containsSecrets: false,
    });
  });

  it("contains no deployment, publication, Firestore, or Cloud Run mutation command", () => {
    const sources = [
      "src/services/shadow-readiness.ts",
      "src/services/release-governance.ts",
      "release/shadow-readiness.json",
      "release/release-manifest.json",
    ].map((path) => readFileSync(resolve(repositoryRoot, path), "utf8")).join("\n");
    expect(sources).not.toMatch(/\bgcloud\s+(?:run|deploy|services\s+update)|setTraffic|models\.generateContent|firebase-admin|from\s+["']@google-cloud\/firestore["']/i);
  });
});
