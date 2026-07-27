import { z } from "zod";
import { Phase5ArtifactIdSchema } from "./identifiers";
import {
  ArtifactLineageReferenceSchema,
  PHASE5_PROVENANCE_CONTRACT_VERSION,
  Phase5ProvenanceSchema,
} from "./provenance";
import { UtcTimestampSchema } from "./utc-time";
import { parsePhase5Contract } from "./validation-error";

export const PHASE5_ARTIFACT_SCHEMA_VERSION = "phase5-artifact-envelope-v1" as const;
export const PHASE5_CONTRACT_VERSION = "phase5-contracts-v1" as const;
export const PHASE5_PRODUCER_VERSION = "phase5-source-intelligence-5.1a-v1" as const;

export const Phase5ArtifactFamilySchema = z.literal("source_intelligence");
export const Phase5ArtifactKindSchema = z.enum([
  "contract_fixture",
  "provenance_record",
  "source_fingerprint_record",
]);

export const Phase5BoundedPayloadSchema = z.object({
  dataVersion: z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._:+-]*$/),
  attributes: z.array(z.object({
    name: z.string().min(1).max(64).regex(/^[A-Za-z][A-Za-z0-9._-]*$/),
    value: z.string().max(512),
  }).strict()).max(32),
}).strict().superRefine((value, context) => {
  const names = value.attributes.map((attribute) => attribute.name);
  if (new Set(names).size !== names.length) {
    context.addIssue({ code: "custom", message: "Duplicate payload attribute." });
  }
});

export const Phase5ArtifactEnvelopeSchema = z.object({
  artifactFamily: Phase5ArtifactFamilySchema,
  artifactKind: Phase5ArtifactKindSchema,
  schemaVersion: z.literal(PHASE5_ARTIFACT_SCHEMA_VERSION),
  contractVersion: z.literal(PHASE5_CONTRACT_VERSION),
  producerVersion: z.literal(PHASE5_PRODUCER_VERSION),
  artifactId: Phase5ArtifactIdSchema,
  createdAt: UtcTimestampSchema,
  provenance: Phase5ProvenanceSchema,
  payload: Phase5BoundedPayloadSchema,
  supersedes: ArtifactLineageReferenceSchema.optional(),
  correction: ArtifactLineageReferenceSchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.provenance.contractVersion !== PHASE5_PROVENANCE_CONTRACT_VERSION) {
    context.addIssue({ code: "custom", message: "Unsupported provenance contract version." });
  }

  const relatedIds = [
    ...value.provenance.parentArtifactIds,
    ...value.provenance.correctionLineage.map((reference) => reference.artifactId),
    ...value.provenance.supersessionLineage.map((reference) => reference.artifactId),
    value.supersedes?.artifactId,
    value.correction?.artifactId,
  ].filter((id): id is NonNullable<typeof id> => id !== undefined);

  if (relatedIds.includes(value.artifactId)) {
    context.addIssue({ code: "custom", message: "An artifact cannot reference itself." });
  }

  if (
    value.supersedes
    && !value.provenance.supersessionLineage.some(
      (reference) => reference.artifactId === value.supersedes?.artifactId,
    )
  ) {
    context.addIssue({ code: "custom", message: "Supersedes reference must exist in provenance lineage." });
  }

  if (
    value.correction
    && !value.provenance.correctionLineage.some(
      (reference) => reference.artifactId === value.correction?.artifactId,
    )
  ) {
    context.addIssue({ code: "custom", message: "Correction reference must exist in provenance lineage." });
  }
});

export type Phase5ArtifactEnvelope = z.infer<typeof Phase5ArtifactEnvelopeSchema>;

export function parsePhase5ArtifactEnvelope(input: unknown): Phase5ArtifactEnvelope {
  return parsePhase5Contract(Phase5ArtifactEnvelopeSchema, input);
}
