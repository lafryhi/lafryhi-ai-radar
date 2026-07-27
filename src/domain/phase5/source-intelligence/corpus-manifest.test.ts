import { describe, expect, it } from "vitest";
import {
  accountCorpusComposition,
  createCorpusManifest,
  inspectCorpusManifest,
  sealCorpusPartition,
  validateCorpusManifest,
  type CorpusManifestInput,
} from "./corpus-manifest";

const digest = (letter: string) => `sha256:${letter.repeat(64)}`;

function document(sampleId: string, partition: "development" | "validation" | "holdout" = "development", language: "en" | "fr" | "ar" = "en") {
  return {
    sampleId,
    partition,
    familyIds: [`family-${sampleId}`],
    language,
    category: "exact_duplicates" as const,
    contentDigest: digest("a"),
    annotationDigest: digest("b"),
    license: "synthetic" as const,
    privacyClass: "synthetic" as const,
    retentionClass: "versioned" as const,
    provenanceReference: `fixture-${sampleId}`,
    approvalStatus: "approved" as const,
  };
}

function baseManifest(): Omit<CorpusManifestInput, "manifestDigest"> {
  return {
    schemaVersion: "p5-corpus-manifest-v1",
    corpusVersion: "p5-corpus-v0-manifest-v1",
    algorithmVersion: "p5-corpus-manifest-integrity-v1",
    governance: {
      compositionVersion: "p5-corpus-v0-planned",
      languagePolicyVersion: "phase5-language-cohort-v1",
      privacyPolicyVersion: "phase5-corpus-privacy-v1",
      retentionPolicyVersion: "phase5-corpus-retention-v1",
      approvalReference: "synthetic-fixtures-approved",
    },
    documents: [document("sample-b"), document("sample-c"), document("sample-a", "validation", "fr")],
    relationshipUnits: [{
      unitId: "unit-a",
      category: "exact_duplicates",
      partition: "development",
      sampleIds: ["sample-b", "sample-c"],
      label: "synthetic exact pair",
      annotationDigest: digest("c"),
    }],
    sealedPartitions: [],
  };
}

describe("Phase 5.1C corpus manifest tooling", () => {
  it("canonicalizes ordering and produces a byte-deterministic integrity digest", () => {
    const first = createCorpusManifest(baseManifest());
    const reversed = baseManifest();
    reversed.documents.reverse();
    reversed.relationshipUnits[0].sampleIds.reverse();
    const second = createCorpusManifest(reversed);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(validateCorpusManifest(first)).toEqual(first);
  });

  it("rejects duplicate IDs, unknown references, partition mismatch, and family leakage", () => {
    const duplicate = baseManifest();
    duplicate.documents.push(document("sample-a"));
    expect(() => createCorpusManifest(duplicate)).toThrow(/validation failed/i);

    const unknown = baseManifest();
    unknown.relationshipUnits[0].sampleIds = ["sample-b", "missing"];
    expect(() => createCorpusManifest(unknown)).toThrow(/validation failed/i);

    const mismatch = baseManifest();
    mismatch.relationshipUnits[0].partition = "validation";
    expect(() => createCorpusManifest(mismatch)).toThrow(/validation failed/i);

    const leak = baseManifest();
    leak.documents[2].familyIds = ["family-sample-b"];
    expect(() => createCorpusManifest(leak)).toThrow(/validation failed/i);
  });

  it("returns bounded diagnostics without fixture content", () => {
    const invalid = baseManifest();
    invalid.documents[0].sampleId = "not valid";
    const report = inspectCorpusManifest(invalid);
    expect(report.status).toBe("INVALID");
    expect(JSON.stringify(report)).not.toContain("not valid");
    expect(report.diagnostics.every((entry) => entry.path.length <= 128)).toBe(true);
  });

  it("seals a partition and rejects mutation after sealing", () => {
    const sealed = sealCorpusPartition(createCorpusManifest(baseManifest()), "development");
    expect(validateCorpusManifest(sealed)).toEqual(sealed);
    const mutated = structuredClone(sealed);
    mutated.documents[1].contentDigest = digest("d");
    const report = inspectCorpusManifest(mutated);
    expect(report.status).toBe("INVALID");
    expect(report.diagnostics.map((entry) => entry.code)).toContain("sealed_partition_mutated");
  });

  it("accounts for composition without claiming the planned corpus exists", () => {
    const account = accountCorpusComposition(createCorpusManifest(baseManifest()));
    expect(account.documentsTotal).toBe(3);
    expect(account.relationshipUnitsTotal).toBe(1);
    expect(account.documentsByPartition.development).toBe(2);
    expect(account.documentsByPartition.validation).toBe(1);
    expect(account.documentsByLanguage.en).toBe(2);
    expect(account.documentsByLanguage.fr).toBe(1);
    expect(account.meetsPlannedMinimums).toBe(false);
    expect(account.plannedMinimums.uniqueDocuments).toBe(240);
  });
});
