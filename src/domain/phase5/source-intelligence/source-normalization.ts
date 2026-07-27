import { z } from "zod";
import { Phase5ArtifactIdSchema } from "./identifiers";
import { Phase5ProvenanceSchema } from "./provenance";
import { UtcTimestampSchema } from "./utc-time";
import { parsePhase5Contract } from "./validation-error";

export const SOURCE_NORMALIZATION_VERSION = "phase5-source-normalization-v1" as const;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_TITLE_BYTES = 4096;

export const InputSizeClassificationSchema = z.enum(["SMALL", "MEDIUM", "LARGE"]);
export const NormalizationDecisionSchema = z.enum([
  "CONTROL_CHARACTER_REMOVED",
  "LINE_ENDING_NORMALIZED",
  "NFC_NORMALIZED",
  "OUTER_WHITESPACE_REMOVED",
  "WHITESPACE_NORMALIZED",
]);
export const NormalizationWarningSchema = z.enum([
  "EMPTY_BODY",
  "LANGUAGE_UNEVALUATED",
  "MIXED_LANGUAGE_HINT",
]);

const languageHintSchema = z.enum(["en", "fr", "ar", "mixed", "unknown"]);
const optionalBoundedText = (maximum: number) => z.string().max(maximum).optional();

export const SourceNormalizationInputSchema = z.object({
  artifactId: Phase5ArtifactIdSchema,
  generatedAt: UtcTimestampSchema,
  provenance: Phase5ProvenanceSchema,
  title: z.string().max(MAX_TITLE_BYTES),
  body: z.string(),
  author: optionalBoundedText(512),
  publicationTimeText: optionalBoundedText(128),
  languageHint: languageHintSchema.optional(),
  sourceUrlReference: optionalBoundedText(512),
}).strict().superRefine((value, context) => {
  if (Buffer.byteLength(value.body, "utf8") > MAX_BODY_BYTES) {
    context.addIssue({ code: "too_big", origin: "string", maximum: MAX_BODY_BYTES, inclusive: true, path: ["body"] });
  }
});

export const NormalizedTextSchema = z.object({
  display: z.string(),
  comparison: z.string(),
  digestInput: z.string(),
}).strict();

export const NormalizedSourceDocumentSchema = z.object({
  title: NormalizedTextSchema,
  body: NormalizedTextSchema,
  author: NormalizedTextSchema.optional(),
  publicationTimeText: NormalizedTextSchema.optional(),
  languageHint: languageHintSchema.optional(),
  sourceUrlReference: z.string().max(512).optional(),
}).strict();

export const SourceNormalizationResultSchema = z.object({
  version: z.literal(SOURCE_NORMALIZATION_VERSION),
  artifactId: Phase5ArtifactIdSchema,
  generatedAt: UtcTimestampSchema,
  provenance: Phase5ProvenanceSchema,
  status: z.enum(["NORMALIZED", "INSUFFICIENT_CONTENT"]),
  inputSize: InputSizeClassificationSchema,
  decisions: z.array(NormalizationDecisionSchema).max(16),
  warnings: z.array(NormalizationWarningSchema).max(8),
  document: NormalizedSourceDocumentSchema,
}).strict();

export type InputSizeClassification = z.infer<typeof InputSizeClassificationSchema>;
export type NormalizationDecision = z.infer<typeof NormalizationDecisionSchema>;
export type NormalizationWarning = z.infer<typeof NormalizationWarningSchema>;
export type NormalizedSourceDocument = z.infer<typeof NormalizedSourceDocumentSchema>;
export type SourceNormalizationResult = z.infer<typeof SourceNormalizationResultSchema>;

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeText(input: string, decisions: Set<NormalizationDecision>): z.infer<typeof NormalizedTextSchema> {
  const nfc = input.normalize("NFC");
  if (nfc !== input) decisions.add("NFC_NORMALIZED");
  const lineNormalized = nfc.replace(/\r\n?|\u2028|\u2029/gu, "\n");
  if (lineNormalized !== nfc) decisions.add("LINE_ENDING_NORMALIZED");
  const controlsRemoved = lineNormalized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "");
  if (controlsRemoved !== lineNormalized) decisions.add("CONTROL_CHARACTER_REMOVED");
  const whitespaceNormalized = controlsRemoved
    .split("\n")
    .map((line) => line.replace(/[\t \f\v\u00A0]+/gu, " ").trim())
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
  if (whitespaceNormalized !== controlsRemoved) {
    decisions.add("WHITESPACE_NORMALIZED");
    if (controlsRemoved.trim() !== controlsRemoved) decisions.add("OUTER_WHITESPACE_REMOVED");
  }
  return {
    display: whitespaceNormalized,
    comparison: whitespaceNormalized.toLowerCase(),
    digestInput: whitespaceNormalized,
  };
}

function classifySize(bytes: number): InputSizeClassification {
  if (bytes <= 4 * 1024) return "SMALL";
  if (bytes <= 256 * 1024) return "MEDIUM";
  return "LARGE";
}

export function normalizeSourceContent(input: unknown): SourceNormalizationResult {
  const parsed = parsePhase5Contract(SourceNormalizationInputSchema, input);
  const decisions = new Set<NormalizationDecision>();
  const warnings = new Set<NormalizationWarning>();
  const document: NormalizedSourceDocument = {
    title: normalizeText(parsed.title, decisions),
    body: normalizeText(parsed.body, decisions),
    ...(parsed.author === undefined ? {} : { author: normalizeText(parsed.author, decisions) }),
    ...(parsed.publicationTimeText === undefined
      ? {}
      : { publicationTimeText: normalizeText(parsed.publicationTimeText, decisions) }),
    ...(parsed.languageHint === undefined ? {} : { languageHint: parsed.languageHint }),
    ...(parsed.sourceUrlReference === undefined ? {} : { sourceUrlReference: parsed.sourceUrlReference }),
  };

  if (document.body.display === "") warnings.add("EMPTY_BODY");
  if (parsed.languageHint === "mixed") warnings.add("MIXED_LANGUAGE_HINT");
  if (parsed.languageHint === "unknown") warnings.add("LANGUAGE_UNEVALUATED");

  const status = document.title.display === "" && document.body.display === ""
    ? "INSUFFICIENT_CONTENT"
    : "NORMALIZED";
  const totalBytes = Buffer.byteLength(parsed.title, "utf8") + Buffer.byteLength(parsed.body, "utf8");

  return parsePhase5Contract(SourceNormalizationResultSchema, {
    version: SOURCE_NORMALIZATION_VERSION,
    artifactId: parsed.artifactId,
    generatedAt: parsed.generatedAt,
    provenance: parsed.provenance,
    status,
    inputSize: classifySize(totalBytes),
    decisions: [...decisions].sort(compareCodePoints),
    warnings: [...warnings].sort(compareCodePoints),
    document,
  });
}
