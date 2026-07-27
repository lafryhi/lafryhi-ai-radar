import { describe, expect, it } from "vitest";
import {
  AnalysisIdSchema,
  EntityCandidateIdSchema,
  Phase5ArtifactEnvelopeSchema,
  Phase5ArtifactIdSchema,
  Phase5ContractValidationError,
  ProcessingRunIdSchema,
  PublicationIdSchema,
  ReviewIdSchema,
  SourceDefinitionIdSchema,
  SourceFingerprintIdSchema,
  SourceRecordIdSchema,
  StoryCandidateIdSchema,
  StoryVersionIdSchema,
  UtcTimestampSchema,
  parsePhase5ArtifactEnvelope,
  parseUtcTimestamp,
  serializeUtcTimestamp,
} from "./index";

const digestA = "a".repeat(64);
const digestB = "b".repeat(64);
const digestC = "c".repeat(64);

function artifactId(kind: string, digest = digestA) {
  return `p5-artifact:v1:${kind}:${digest}`;
}

function lineage(artifact: string, reasonCode: string) {
  return { artifactId: artifact, reasonCode };
}

function validEnvelope() {
  return {
    artifactFamily: "source_intelligence",
    artifactKind: "contract_fixture",
    schemaVersion: "phase5-artifact-envelope-v1",
    contractVersion: "phase5-contracts-v1",
    producerVersion: "phase5-source-intelligence-5.1a-v1",
    artifactId: artifactId("fixture"),
    createdAt: "2026-07-27T12:00:00.000Z",
    provenance: {
      contractVersion: "phase5-provenance-v1",
      sourceDefinitionId: "source-definition-1",
      sourceRecordId: "source-record-1",
      processingRunId: "processing-run-1",
      parentArtifactIds: [] as string[],
      transformation: {
        identifier: "phase5.contract-fixture",
        version: "v1",
      },
      contentDigest: {
        algorithm: "sha256",
        digest: digestB,
      },
      generatedAt: "2026-07-27T12:00:00.000Z",
      producerIdentity: "phase5-test",
      derivationReason: "test_fixture",
      correctionLineage: [] as Array<{ artifactId: string; reasonCode: string }>,
      supersessionLineage: [] as Array<{ artifactId: string; reasonCode: string }>,
    },
    payload: {
      dataVersion: "fixture-v1",
      attributes: [
        { name: "scenario", value: "bounded synthetic fixture" },
      ],
    },
  };
}

describe("Phase 5.1A identity contracts", () => {
  it("accepts bounded authoritative Phase 4 references without generating replacements", () => {
    for (const schema of [
      SourceDefinitionIdSchema,
      SourceRecordIdSchema,
      ProcessingRunIdSchema,
      AnalysisIdSchema,
      ReviewIdSchema,
      PublicationIdSchema,
    ]) {
      expect(schema.parse("existing-id:alpha_1")).toBe("existing-id:alpha_1");
    }
  });

  it("rejects invalid, excessive, whitespace, and non-ASCII opaque identifiers", () => {
    for (const value of ["", " leading", "has space", "é", "a".repeat(129)]) {
      expect(SourceRecordIdSchema.safeParse(value).success).toBe(false);
    }
  });

  it("validates every versioned Phase 5 identity family without generating IDs", () => {
    expect(SourceFingerprintIdSchema.parse(`source-fingerprint:v1:${digestA}`)).toBe(`source-fingerprint:v1:${digestA}`);
    expect(StoryCandidateIdSchema.parse(`story-candidate:v1:${digestA}`)).toBe(`story-candidate:v1:${digestA}`);
    expect(StoryVersionIdSchema.parse(`story-version:v1:${digestA}`)).toBe(`story-version:v1:${digestA}`);
    expect(EntityCandidateIdSchema.parse(`entity-candidate:v1:${digestA}`)).toBe(`entity-candidate:v1:${digestA}`);
    expect(Phase5ArtifactIdSchema.parse(artifactId("fixture"))).toBe(artifactId("fixture"));
  });

  it("fails closed for unsupported identity versions and malformed digests", () => {
    for (const value of [
      `source-fingerprint:v2:${digestA}`,
      `story-candidate:v1:${digestA.toUpperCase()}`,
      "story-version:v1:short",
      `entity-candidate:v1:${digestA}extra`,
      `p5-artifact:v2:fixture:${digestA}`,
      `p5-artifact:v1:Invalid:${digestA}`,
    ]) {
      expect(
        SourceFingerprintIdSchema.safeParse(value).success
        || StoryCandidateIdSchema.safeParse(value).success
        || StoryVersionIdSchema.safeParse(value).success
        || EntityCandidateIdSchema.safeParse(value).success
        || Phase5ArtifactIdSchema.safeParse(value).success,
      ).toBe(false);
    }
  });
});

describe("Phase 5.1A UTC time contract", () => {
  it("parses and serializes explicit millisecond UTC timestamps deterministically", () => {
    const input = "2026-07-27T12:34:56.789Z";
    const parsed = parseUtcTimestamp(input);
    expect(serializeUtcTimestamp(parsed)).toBe(input);
    expect(parseUtcTimestamp(input)).toBe(parsed);
  });

  it("rejects offsets, missing milliseconds, invalid calendar dates, and implicit values", () => {
    for (const value of [
      "2026-07-27T13:34:56.789+01:00",
      "2026-07-27T12:34:56Z",
      "2026-02-30T12:34:56.000Z",
      "",
      undefined,
      0,
    ]) {
      expect(UtcTimestampSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe("Phase 5.1A artifact envelope and provenance", () => {
  it("accepts a complete strict envelope with explicit time and identity", () => {
    expect(parsePhase5ArtifactEnvelope(validEnvelope())).toEqual(validEnvelope());
  });

  it("rejects missing explicit artifact identity or timestamps", () => {
    const withoutId = validEnvelope();
    Reflect.deleteProperty(withoutId, "artifactId");
    expect(Phase5ArtifactEnvelopeSchema.safeParse(withoutId).success).toBe(false);

    const withoutCreatedAt = validEnvelope();
    Reflect.deleteProperty(withoutCreatedAt, "createdAt");
    expect(Phase5ArtifactEnvelopeSchema.safeParse(withoutCreatedAt).success).toBe(false);

    const withoutGeneratedAt = validEnvelope();
    Reflect.deleteProperty(withoutGeneratedAt.provenance, "generatedAt");
    expect(Phase5ArtifactEnvelopeSchema.safeParse(withoutGeneratedAt).success).toBe(false);
  });

  it("fails closed for unsupported schema, contract, producer, and provenance versions", () => {
    for (const mutation of [
      { schemaVersion: "phase5-artifact-envelope-v2" },
      { contractVersion: "phase5-contracts-v2" },
      { producerVersion: "phase5-source-intelligence-5.1b-v1" },
    ]) {
      expect(Phase5ArtifactEnvelopeSchema.safeParse({ ...validEnvelope(), ...mutation }).success).toBe(false);
    }

    const provenanceVersion = validEnvelope();
    provenanceVersion.provenance.contractVersion = "phase5-provenance-v2";
    expect(Phase5ArtifactEnvelopeSchema.safeParse(provenanceVersion).success).toBe(false);
  });

  it("rejects unknown keys at envelope, provenance, lineage, and payload boundaries", () => {
    expect(Phase5ArtifactEnvelopeSchema.safeParse({ ...validEnvelope(), unknown: true }).success).toBe(false);

    const provenanceUnknown = validEnvelope();
    Object.assign(provenanceUnknown.provenance, { rawArticleBody: "synthetic-forbidden" });
    expect(Phase5ArtifactEnvelopeSchema.safeParse(provenanceUnknown).success).toBe(false);

    const payloadUnknown = validEnvelope();
    Object.assign(payloadUnknown.payload, { metadata: { unbounded: true } });
    expect(Phase5ArtifactEnvelopeSchema.safeParse(payloadUnknown).success).toBe(false);
  });

  it("rejects excessive parent, lineage, payload, and string bounds", () => {
    const parents = validEnvelope();
    parents.provenance.parentArtifactIds = Array.from(
      { length: 17 },
      (_, index) => artifactId("parent", index.toString(16).padStart(64, "0")),
    );
    expect(Phase5ArtifactEnvelopeSchema.safeParse(parents).success).toBe(false);

    const lineageOverflow = validEnvelope();
    lineageOverflow.provenance.correctionLineage = Array.from(
      { length: 9 },
      (_, index) => lineage(artifactId("parent", index.toString(16).padStart(64, "0")), "correction"),
    );
    expect(Phase5ArtifactEnvelopeSchema.safeParse(lineageOverflow).success).toBe(false);

    const payloadOverflow = validEnvelope();
    payloadOverflow.payload.attributes = Array.from(
      { length: 33 },
      (_, index) => ({ name: `field-${index}`, value: "value" }),
    );
    expect(Phase5ArtifactEnvelopeSchema.safeParse(payloadOverflow).success).toBe(false);

    const excessiveProducer = validEnvelope();
    excessiveProducer.provenance.producerIdentity = "x".repeat(65);
    expect(Phase5ArtifactEnvelopeSchema.safeParse(excessiveProducer).success).toBe(false);
  });

  it("requires at least one bounded provenance input reference", () => {
    const input = validEnvelope();
    Reflect.deleteProperty(input.provenance, "sourceDefinitionId");
    Reflect.deleteProperty(input.provenance, "sourceRecordId");
    Reflect.deleteProperty(input.provenance, "processingRunId");
    expect(Phase5ArtifactEnvelopeSchema.safeParse(input).success).toBe(false);
  });

  it("accepts consistent correction lineage and rejects missing or overlapping lineage", () => {
    const correctedId = artifactId("fixture", digestC);
    const correction = validEnvelope();
    correction.provenance.correctionLineage = [lineage(correctedId, "invalid_contract")];
    Object.assign(correction, { correction: lineage(correctedId, "invalid_contract") });
    expect(Phase5ArtifactEnvelopeSchema.safeParse(correction).success).toBe(true);

    const missing = validEnvelope();
    Object.assign(missing, { correction: lineage(correctedId, "invalid_contract") });
    expect(Phase5ArtifactEnvelopeSchema.safeParse(missing).success).toBe(false);

    const overlap = validEnvelope();
    overlap.provenance.correctionLineage = [lineage(correctedId, "invalid_contract")];
    overlap.provenance.supersessionLineage = [lineage(correctedId, "superseded")];
    expect(Phase5ArtifactEnvelopeSchema.safeParse(overlap).success).toBe(false);
  });

  it("accepts consistent supersession lineage and rejects self or missing lineage", () => {
    const priorId = artifactId("fixture", digestC);
    const supersession = validEnvelope();
    supersession.provenance.supersessionLineage = [lineage(priorId, "new_contract_version")];
    Object.assign(supersession, { supersedes: lineage(priorId, "new_contract_version") });
    expect(Phase5ArtifactEnvelopeSchema.safeParse(supersession).success).toBe(true);

    const missing = validEnvelope();
    Object.assign(missing, { supersedes: lineage(priorId, "new_contract_version") });
    expect(Phase5ArtifactEnvelopeSchema.safeParse(missing).success).toBe(false);

    const self = validEnvelope();
    self.provenance.parentArtifactIds = [self.artifactId];
    expect(Phase5ArtifactEnvelopeSchema.safeParse(self).success).toBe(false);
  });

  it("returns identical parsed values for identical explicit inputs", () => {
    const first = parsePhase5ArtifactEnvelope(validEnvelope());
    const second = parsePhase5ArtifactEnvelope(validEnvelope());
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("returns bounded privacy-safe errors without echoing sensitive input", () => {
    const secretMarker = "SECRET-MARKER-DO-NOT-ECHO";
    const invalid = {
      ...validEnvelope(),
      payload: {
        dataVersion: "fixture-v1",
        attributes: [{ name: "secret", value: secretMarker.repeat(50) }],
        rawGeminiOutput: secretMarker,
      },
    };

    try {
      parsePhase5ArtifactEnvelope(invalid);
      throw new Error("Expected validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(Phase5ContractValidationError);
      const safe = error as Phase5ContractValidationError;
      expect(safe.message).toBe("Phase 5 contract validation failed.");
      expect(safe.issues.length).toBeGreaterThan(0);
      expect(safe.issues.length).toBeLessThanOrEqual(20);
      expect(JSON.stringify({ message: safe.message, issues: safe.issues })).not.toContain(secretMarker);
    }
  });
});
