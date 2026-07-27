import { z } from "zod";

const OPAQUE_ID_MAX_LENGTH = 128;
const opaqueIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const versionedDigestPattern = /^[a-f0-9]{64}$/;

function opaqueId<T extends string>() {
  return z.string()
    .min(1)
    .max(OPAQUE_ID_MAX_LENGTH)
    .regex(opaqueIdentifierPattern)
    .brand<T>();
}

function versionedDigestId<T extends string>(prefix: string) {
  return z.string()
    .max(160)
    .refine((value) => {
      const expectedPrefix = `${prefix}:v1:`;
      return value.startsWith(expectedPrefix)
        && versionedDigestPattern.test(value.slice(expectedPrefix.length));
    }, { message: "Invalid versioned identifier." })
    .brand<T>();
}

export const SourceDefinitionIdSchema = opaqueId<"SourceDefinitionId">();
export const SourceRecordIdSchema = opaqueId<"SourceRecordId">();
export const ProcessingRunIdSchema = opaqueId<"ProcessingRunId">();
export const AnalysisIdSchema = opaqueId<"AnalysisId">();
export const ReviewIdSchema = opaqueId<"ReviewId">();
export const PublicationIdSchema = opaqueId<"PublicationId">();

export const SourceFingerprintIdSchema = versionedDigestId<"SourceFingerprintId">("source-fingerprint");
export const StoryCandidateIdSchema = versionedDigestId<"StoryCandidateId">("story-candidate");
export const StoryVersionIdSchema = versionedDigestId<"StoryVersionId">("story-version");
export const EntityCandidateIdSchema = versionedDigestId<"EntityCandidateId">("entity-candidate");

export const Phase5ArtifactIdSchema = z.string()
  .max(192)
  .refine((value) => {
    const match = /^p5-artifact:v1:([a-z][a-z0-9-]{0,31}):([a-f0-9]{64})$/.exec(value);
    return match !== null;
  }, { message: "Invalid Phase 5 artifact identifier." })
  .brand<"Phase5ArtifactId">();

export type SourceDefinitionId = z.infer<typeof SourceDefinitionIdSchema>;
export type SourceRecordId = z.infer<typeof SourceRecordIdSchema>;
export type ProcessingRunId = z.infer<typeof ProcessingRunIdSchema>;
export type AnalysisId = z.infer<typeof AnalysisIdSchema>;
export type ReviewId = z.infer<typeof ReviewIdSchema>;
export type PublicationId = z.infer<typeof PublicationIdSchema>;
export type SourceFingerprintId = z.infer<typeof SourceFingerprintIdSchema>;
export type StoryCandidateId = z.infer<typeof StoryCandidateIdSchema>;
export type StoryVersionId = z.infer<typeof StoryVersionIdSchema>;
export type EntityCandidateId = z.infer<typeof EntityCandidateIdSchema>;
export type Phase5ArtifactId = z.infer<typeof Phase5ArtifactIdSchema>;
