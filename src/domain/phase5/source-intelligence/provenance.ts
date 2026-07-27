import { z } from "zod";
import {
  Phase5ArtifactIdSchema,
  ProcessingRunIdSchema,
  SourceDefinitionIdSchema,
  SourceRecordIdSchema,
} from "./identifiers";
import { UtcTimestampSchema } from "./utc-time";

export const PHASE5_PROVENANCE_CONTRACT_VERSION = "phase5-provenance-v1" as const;

const boundedIdentifier = z.string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

const boundedVersion = z.string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:+-]*$/);

export const ContentDigestReferenceSchema = z.object({
  algorithm: z.literal("sha256"),
  digest: z.string().length(64).regex(/^[a-f0-9]{64}$/),
}).strict();

export const ArtifactLineageReferenceSchema = z.object({
  artifactId: Phase5ArtifactIdSchema,
  reasonCode: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/),
}).strict();

const uniqueLineage = z.array(ArtifactLineageReferenceSchema).max(8)
  .superRefine((references, context) => {
    const ids = references.map((reference) => reference.artifactId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "Duplicate lineage reference." });
    }
  });

export const Phase5ProvenanceSchema = z.object({
  contractVersion: z.literal(PHASE5_PROVENANCE_CONTRACT_VERSION),
  sourceDefinitionId: SourceDefinitionIdSchema.optional(),
  sourceRecordId: SourceRecordIdSchema.optional(),
  processingRunId: ProcessingRunIdSchema.optional(),
  parentArtifactIds: z.array(Phase5ArtifactIdSchema).max(16)
    .superRefine((ids, context) => {
      if (new Set(ids).size !== ids.length) {
        context.addIssue({ code: "custom", message: "Duplicate parent artifact reference." });
      }
    }),
  transformation: z.object({
    identifier: boundedIdentifier,
    version: boundedVersion,
  }).strict(),
  contentDigest: ContentDigestReferenceSchema,
  generatedAt: UtcTimestampSchema,
  producerIdentity: boundedIdentifier,
  derivationReason: z.enum([
    "source_ingestion",
    "deterministic_transformation",
    "correction",
    "supersession",
    "test_fixture",
  ]),
  correctionLineage: uniqueLineage,
  supersessionLineage: uniqueLineage,
}).strict().superRefine((value, context) => {
  if (
    value.sourceDefinitionId === undefined
    && value.sourceRecordId === undefined
    && value.processingRunId === undefined
    && value.parentArtifactIds.length === 0
  ) {
    context.addIssue({ code: "custom", message: "At least one provenance input reference is required." });
  }

  const correctionIds = new Set(value.correctionLineage.map((reference) => reference.artifactId));
  if (value.supersessionLineage.some((reference) => correctionIds.has(reference.artifactId))) {
    context.addIssue({ code: "custom", message: "Correction and supersession lineage cannot overlap." });
  }
});

export type ContentDigestReference = z.infer<typeof ContentDigestReferenceSchema>;
export type ArtifactLineageReference = z.infer<typeof ArtifactLineageReferenceSchema>;
export type Phase5Provenance = z.infer<typeof Phase5ProvenanceSchema>;
