import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FORBIDDEN_TERM_SETTINGS,
  detectForbiddenTermsInFields,
  normalizeForbiddenText,
  validateForbiddenTermConfiguration,
} from "@/domain/forbidden-term-detector";
import { evaluateEditorialPolicyFacts, EDITORIAL_POLICY_CONSTITUTION } from "../editorial-policy-engine";
import { forensicValidateReport } from "./forensic-validator";
import { resolveIntegrity } from "./integrity";
import { EvaluationReportSchema } from "./report-writer";

const root = resolve(__dirname, "../../..");

describe("canonical forbidden-term detector", () => {
  it.each([
    ["all firms", ["all firms"]],
    ["ALL FIRMS", ["all firms"]],
    ["all—firms", ["all firms"]],
    ["all   firms", ["all firms"]],
    ["Ce résultat est GARANTI.", ["garanti"]],
    ["English, français garanti, العربية، all firms.", ["all firms", "garanti"]],
  ])("normalizes and detects %s deterministically", (text, expected) => {
    const result = detectForbiddenTermsInFields({ modelOutput: text }, EDITORIAL_POLICY_CONSTITUTION.forbiddenTerms);
    expect(result.normalizedDetectedTerms).toEqual(expected);
    expect(result.checkedFieldNames).toEqual(["modelOutput"]);
    expect(result.detectorVersion).toBe("forbidden-term-detector-v1");
  });

  it("uses token boundaries and avoids longer-word false positives", () => {
    expect(detectForbiddenTermsInFields(
      { modelOutput: "small firms, guarantees, and warranty guarantees" },
      EDITORIAL_POLICY_CONSTITUTION.forbiddenTerms,
    ).detectionCount).toBe(0);
  });

  it("normalizes accents, apostrophes, dashes, punctuation, and whitespace", () => {
    expect(normalizeForbiddenText("  L’ACTE—GARÁNTI...  ")).toBe("l acte garanti");
  });

  it("returns reproducible privacy-safe evidence without retaining text", () => {
    const secretText = "all firms token=secret";
    const result = detectForbiddenTermsInFields({ decisionOutput: secretText }, EDITORIAL_POLICY_CONSTITUTION.forbiddenTerms);
    expect(result.fieldFingerprints.decisionOutput).toMatch(/^[a-f0-9]{64}$/);
    expect(result.normalizedTokenCount).toBe(4);
    expect(JSON.stringify(result)).not.toContain(secretText);
    expect(JSON.stringify(result)).not.toContain("token=secret");
  });

  it("rejects duplicate, empty, overlapping, invalid-boundary, alternative, and locale configurations", () => {
    expect(() => validateForbiddenTermConfiguration(["garanti", "GARÁNTI"])).toThrow(/unique/);
    expect(() => validateForbiddenTermConfiguration([""])).toThrow(/empty/);
    expect(() => validateForbiddenTermConfiguration(["all", "all firms"])).toThrow(/Overlapping/);
    expect(() => validateForbiddenTermConfiguration(["garanti"], { ...DEFAULT_FORBIDDEN_TERM_SETTINGS, boundaryMode: "SUBSTRING" as never })).toThrow();
    expect(() => validateForbiddenTermConfiguration(["garanti"], {
      ...DEFAULT_FORBIDDEN_TERM_SETTINGS,
      acceptedAlternatives: { garanti: ["garanti"] },
    })).toThrow(/conflict/);
    expect(() => validateForbiddenTermConfiguration(["garanti"], { ...DEFAULT_FORBIDDEN_TERM_SETTINGS, locale: "fr" as never })).toThrow();
  });

  it("shares the same adjudication between expectation logic and EP-006", () => {
    const adjudication = detectForbiddenTermsInFields(
      { modelOutput: "This claim applies to ALL—FIRMS." },
      EDITORIAL_POLICY_CONSTITUTION.forbiddenTerms,
    );
    const policy = evaluateEditorialPolicyFacts({
      originalPosition: "MONITOR",
      evidenceCount: 1,
      evidenceIds: ["E1"],
      signalImportance: 1,
      confidence: 1,
      decisionText: "not reprocessed",
      context: {
        itemId: "same-field",
        allowedPositions: ["MONITOR"],
        sourceTrust: "VERIFIED",
        trustedSourceCount: 1,
        hasSourceConflict: false,
        promotionalContent: false,
        lowImpactContent: false,
        numericalOrDateSensitive: false,
        pendingVerification: false,
        humanReviewState: "PENDING",
        configuredForbiddenTerms: [],
      },
    }, { forbiddenTermAdjudication: adjudication, now: () => new Date("2026-07-30T00:00:00Z") });
    expect(adjudication.detectionCount > 0).toBe(policy.triggeredRuleIds.includes("EP-006"));
  });

  it("contains no independent substring forbidden matcher in evaluation or policy consumers", async () => {
    const sources = await Promise.all([
      "src/services/evaluation/comparator.ts",
      "src/services/editorial-policy-engine.ts",
      "scripts/replay-editorial-policy.ts",
    ].map((path) => readFile(resolve(root, path), "utf8")));
    expect(sources.join("\n")).not.toMatch(/forbiddenKeywords\.every|includes\(` \$\{normalizedTerm\}/);
    expect(sources.every((source) => source.includes("detectForbiddenTermsInFields") || source.includes("forbiddenTermAdjudication"))).toBe(true);
  });
});

describe("shadow report contract and offline forensics", () => {
  it("rejects missing mandatory report metadata and invalid admissibility", () => {
    expect(EvaluationReportSchema.safeParse({ datasetVersion: "1.0" }).success).toBe(false);
    const invalid = {
      integrityClassification: "INVALID_HARNESS",
      qualityMetricsAdmissibility: "ADMISSIBLE",
      recommendation: "ELIGIBLE_FOR_CANARY",
    };
    expect(EvaluationReportSchema.safeParse(invalid).success).toBe(false);
  });

  it("applies deterministic integrity precedence", () => {
    expect(resolveIntegrity([
      { integrity: "INVALID_HARNESS", reasons: ["matcher"] },
      { integrity: "INVALID_REPORT_CONTRACT", reasons: ["metadata"] },
      { integrity: "VALID", reasons: [] },
    ])).toMatchObject({ integrity: "INVALID_REPORT_CONTRACT" });
  });

  it("keeps the first shadow report invalid and observational only with zero calls", async () => {
    const result = await forensicValidateReport(
      "eval/results/2026-07-30T11-35-14-899Z-gemini-migration.json",
      root,
    );
    expect(result).toMatchObject({
      integrityClassification: "INVALID_REPORT_CONTRACT",
      qualityMetricsAdmissibility: "OBSERVATIONAL_ONLY",
      migrationRecommendationPermitted: false,
      modelCalls: 0,
      infrastructureWrites: 0,
    });
    expect(result.allFindings.map((finding) => finding.integrity)).toEqual(
      expect.arrayContaining(["INVALID_REPORT_CONTRACT", "INVALID_HARNESS"]),
    );
  });
});
