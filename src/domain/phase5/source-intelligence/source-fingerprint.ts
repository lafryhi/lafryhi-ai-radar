import { createHash } from "node:crypto";
import { z } from "zod";
import { SourceFingerprintIdSchema } from "./identifiers";
import type { NormalizedSourceDocument } from "./source-normalization";

export const SOURCE_FINGERPRINT_VERSION = "phase5-source-fingerprint-v1" as const;
export const SOURCE_FINGERPRINT_ALGORITHM = "sha256" as const;

export const SourceFingerprintTypeSchema = z.enum([
  "SOURCE_URL",
  "SOURCE_TITLE",
  "SOURCE_BODY",
  "SOURCE_DOCUMENT",
]);

export const SourceFingerprintSchema = z.object({
  version: z.literal(SOURCE_FINGERPRINT_VERSION),
  algorithm: z.literal(SOURCE_FINGERPRINT_ALGORITHM),
  type: SourceFingerprintTypeSchema,
  id: SourceFingerprintIdSchema,
}).strict();

export type SourceFingerprint = z.infer<typeof SourceFingerprintSchema>;
export type SourceUrlFingerprint = SourceFingerprint & { type: "SOURCE_URL" };
export type SourceTitleFingerprint = SourceFingerprint & { type: "SOURCE_TITLE" };
export type SourceBodyFingerprint = SourceFingerprint & { type: "SOURCE_BODY" };
export type SourceDocumentFingerprint = SourceFingerprint & { type: "SOURCE_DOCUMENT" };

function frame(value: string): string {
  return `${Buffer.byteLength(value, "utf8")}:${value}`;
}

function fingerprint(type: SourceFingerprint["type"], values: readonly string[]): SourceFingerprint {
  const domain = `lafryhi\0${SOURCE_FINGERPRINT_VERSION}\0${type}\0`;
  const digest = createHash("sha256")
    .update(domain, "utf8")
    .update(values.map(frame).join(""), "utf8")
    .digest("hex");
  return SourceFingerprintSchema.parse({
    version: SOURCE_FINGERPRINT_VERSION,
    algorithm: SOURCE_FINGERPRINT_ALGORITHM,
    type,
    id: `source-fingerprint:v1:${digest}`,
  });
}

export function fingerprintSourceUrl(normalizedUrl: string): SourceUrlFingerprint {
  return fingerprint("SOURCE_URL", [normalizedUrl]) as SourceUrlFingerprint;
}

export function fingerprintSourceTitle(normalizedTitle: string): SourceTitleFingerprint {
  return fingerprint("SOURCE_TITLE", [normalizedTitle]) as SourceTitleFingerprint;
}

export function fingerprintSourceBody(normalizedBody: string): SourceBodyFingerprint {
  return fingerprint("SOURCE_BODY", [normalizedBody]) as SourceBodyFingerprint;
}

export function fingerprintSourceDocument(
  document: NormalizedSourceDocument,
  normalizedUrl?: string,
): SourceDocumentFingerprint {
  return fingerprint("SOURCE_DOCUMENT", [
    normalizedUrl ?? "",
    document.title.digestInput,
    document.body.digestInput,
    document.author?.digestInput ?? "",
    document.publicationTimeText?.digestInput ?? "",
  ]) as SourceDocumentFingerprint;
}
