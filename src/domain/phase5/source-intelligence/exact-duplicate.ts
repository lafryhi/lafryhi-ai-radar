import { z } from "zod";
import { Phase5ArtifactIdSchema } from "./identifiers";
import { Phase5ProvenanceSchema } from "./provenance";
import { SourceFingerprintSchema } from "./source-fingerprint";
import { UtcTimestampSchema } from "./utc-time";
import { parsePhase5Contract } from "./validation-error";

export const EXACT_DUPLICATE_ALGORITHM_VERSION = "phase5-exact-duplicate-v1" as const;
export const ExactDuplicateDecisionSchema = z.enum([
  "EXACT_URL_DUPLICATE",
  "EXACT_TITLE_DUPLICATE",
  "EXACT_BODY_DUPLICATE",
  "EXACT_DOCUMENT_DUPLICATE",
  "NOT_EXACT_DUPLICATE",
  "INSUFFICIENT_INPUT",
]);

const typedFingerprint = (type: "SOURCE_URL" | "SOURCE_TITLE" | "SOURCE_BODY" | "SOURCE_DOCUMENT") =>
  SourceFingerprintSchema.extend({ type: z.literal(type) });

const fingerprintSetSchema = z.object({
  url: typedFingerprint("SOURCE_URL").optional(),
  title: typedFingerprint("SOURCE_TITLE").optional(),
  body: typedFingerprint("SOURCE_BODY").optional(),
  document: typedFingerprint("SOURCE_DOCUMENT").optional(),
}).strict();

export const ExactDuplicateInputSchema = z.object({
  artifactId: Phase5ArtifactIdSchema,
  generatedAt: UtcTimestampSchema,
  provenance: Phase5ProvenanceSchema,
  left: fingerprintSetSchema,
  right: fingerprintSetSchema,
}).strict();

export const ExactDuplicateResultSchema = z.object({
  algorithmVersion: z.literal(EXACT_DUPLICATE_ALGORITHM_VERSION),
  artifactId: Phase5ArtifactIdSchema,
  generatedAt: UtcTimestampSchema,
  provenance: Phase5ProvenanceSchema,
  advisoryOnly: z.literal(true),
  decision: ExactDuplicateDecisionSchema,
  comparedFingerprintTypes: z.array(z.enum(["url", "title", "body", "document"])).max(4),
  reasons: z.array(z.enum([
    "BODY_CONFLICT",
    "BODY_MATCH",
    "DOCUMENT_MATCH",
    "NO_COMPARABLE_FINGERPRINT",
    "TITLE_CONFLICT",
    "TITLE_MATCH",
    "URL_CONFLICT",
    "URL_MATCH",
  ])).max(8),
}).strict();

export type ExactDuplicateDecision = z.infer<typeof ExactDuplicateDecisionSchema>;
export type ExactDuplicateResult = z.infer<typeof ExactDuplicateResultSchema>;

function equal(
  left: z.infer<typeof fingerprintSetSchema>,
  right: z.infer<typeof fingerprintSetSchema>,
  field: keyof z.infer<typeof fingerprintSetSchema>,
): boolean | undefined {
  if (left[field] === undefined || right[field] === undefined) return undefined;
  return left[field]?.id === right[field]?.id;
}

function decide(
  comparedCount: number,
  matches: Record<string, boolean | undefined>,
): ExactDuplicateDecision {
  if (comparedCount === 0) return "INSUFFICIENT_INPUT";
  if (matches.document === true) return "EXACT_DOCUMENT_DUPLICATE";
  if (matches.body === true && matches.title !== false) return "EXACT_BODY_DUPLICATE";
  if (matches.url === true && matches.body !== false && matches.title !== false) return "EXACT_URL_DUPLICATE";
  if (matches.title === true && matches.body === undefined && matches.url === undefined) {
    return "EXACT_TITLE_DUPLICATE";
  }
  return "NOT_EXACT_DUPLICATE";
}

export function classifyExactDuplicate(input: unknown): ExactDuplicateResult {
  const parsed = parsePhase5Contract(ExactDuplicateInputSchema, input);
  const fields = ["url", "title", "body", "document"] as const;
  const compared = fields.filter((field) => equal(parsed.left, parsed.right, field) !== undefined);
  const matches = Object.fromEntries(fields.map((field) => [field, equal(parsed.left, parsed.right, field)]));
  const reasons: z.infer<typeof ExactDuplicateResultSchema>["reasons"] = [];

  if (matches.url === true) reasons.push("URL_MATCH");
  if (matches.url === false) reasons.push("URL_CONFLICT");
  if (matches.title === true) reasons.push("TITLE_MATCH");
  if (matches.title === false) reasons.push("TITLE_CONFLICT");
  if (matches.body === true) reasons.push("BODY_MATCH");
  if (matches.body === false) reasons.push("BODY_CONFLICT");
  if (matches.document === true) reasons.push("DOCUMENT_MATCH");

  const decision = decide(compared.length, matches);
  if (decision === "INSUFFICIENT_INPUT") reasons.push("NO_COMPARABLE_FINGERPRINT");

  return parsePhase5Contract(ExactDuplicateResultSchema, {
    algorithmVersion: EXACT_DUPLICATE_ALGORITHM_VERSION,
    artifactId: parsed.artifactId,
    generatedAt: parsed.generatedAt,
    provenance: parsed.provenance,
    advisoryOnly: true,
    decision,
    comparedFingerprintTypes: compared,
    reasons,
  });
}
