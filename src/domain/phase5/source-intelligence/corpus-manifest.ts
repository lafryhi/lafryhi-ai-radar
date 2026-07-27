import { createHash } from "node:crypto";
import { z } from "zod";
import { parsePhase5Contract, Phase5ContractValidationError } from "./validation-error";

export const CORPUS_MANIFEST_SCHEMA_VERSION = "p5-corpus-manifest-v1" as const;
export const CORPUS_MANIFEST_ALGORITHM_VERSION = "p5-corpus-manifest-integrity-v1" as const;
export const CORPUS_MANIFEST_VERSION = "p5-corpus-v0-manifest-v1" as const;

const MAX_DOCUMENTS = 10000;
const MAX_UNITS = 20000;
const MAX_STRING = 256;
const identifier = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const partition = z.enum(["development", "validation", "holdout"]);
const language = z.enum(["en", "fr", "ar", "mixed", "unknown"]);

export const CorpusPartitionSchema = partition;
export const CorpusLanguageSchema = language;
export const CorpusLicenseSchema = z.enum(["synthetic", "public_domain", "open_license", "authorized"]);
export const CorpusPrivacyClassSchema = z.enum(["synthetic", "public", "sanitized_authorized"]);
export const CorpusRetentionClassSchema = z.enum(["versioned", "restricted"]);
export const CorpusCategorySchema = z.enum([
  "exact_duplicates", "near_duplicates", "unrelated_articles", "syndicated_articles",
  "updated_articles", "evaluated_language", "mixed_language", "malformed_html",
  "boilerplate_heavy", "contradictory_sources", "common_event",
  "same_publisher_different_article", "different_publisher_same_event", "false_merge_traps",
  "false_split_traps", "canonical_url_variants", "tracking_parameter_variants",
  "unicode_normalization_edges", "empty_insufficient_content", "very_long_content",
]);

const governanceMetadataSchema = z.object({
  compositionVersion: z.literal("p5-corpus-v0-planned"),
  languagePolicyVersion: z.string().min(1).max(MAX_STRING),
  privacyPolicyVersion: z.string().min(1).max(MAX_STRING),
  retentionPolicyVersion: z.string().min(1).max(MAX_STRING),
  approvalReference: z.string().min(1).max(MAX_STRING),
}).strict();

export const CorpusDocumentSchema = z.object({
  sampleId: identifier,
  partition,
  familyIds: z.array(identifier).max(32),
  language,
  category: CorpusCategorySchema,
  contentDigest: digest,
  annotationDigest: digest,
  license: CorpusLicenseSchema,
  privacyClass: CorpusPrivacyClassSchema,
  retentionClass: CorpusRetentionClassSchema,
  provenanceReference: z.string().min(1).max(MAX_STRING),
  approvalStatus: z.literal("approved"),
}).strict();

export const CorpusRelationshipUnitSchema = z.object({
  unitId: identifier,
  category: CorpusCategorySchema,
  partition,
  sampleIds: z.array(identifier).min(2).max(64),
  label: z.string().min(1).max(MAX_STRING),
  annotationDigest: digest,
}).strict();

export const CorpusPartitionSealSchema = z.object({
  partition,
  sealDigest: digest,
}).strict();

export const CorpusManifestSchema = z.object({
  schemaVersion: z.literal(CORPUS_MANIFEST_SCHEMA_VERSION),
  corpusVersion: z.literal(CORPUS_MANIFEST_VERSION),
  algorithmVersion: z.literal(CORPUS_MANIFEST_ALGORITHM_VERSION),
  governance: governanceMetadataSchema,
  documents: z.array(CorpusDocumentSchema).max(MAX_DOCUMENTS),
  relationshipUnits: z.array(CorpusRelationshipUnitSchema).max(MAX_UNITS),
  sealedPartitions: z.array(CorpusPartitionSealSchema).max(3),
  manifestDigest: digest,
}).strict();

export type CorpusPartition = z.infer<typeof CorpusPartitionSchema>;
export type CorpusLanguage = z.infer<typeof CorpusLanguageSchema>;
export type CorpusCategory = z.infer<typeof CorpusCategorySchema>;
export type CorpusDocument = z.infer<typeof CorpusDocumentSchema>;
export type CorpusRelationshipUnit = z.infer<typeof CorpusRelationshipUnitSchema>;
export type CorpusPartitionSeal = z.infer<typeof CorpusPartitionSealSchema>;
export type CorpusManifest = z.infer<typeof CorpusManifestSchema>;
export type CorpusManifestInput = Omit<CorpusManifest, "manifestDigest"> & { manifestDigest?: string };

export interface CorpusManifestIssue {
  code: string;
  path: string;
}

export const CorpusManifestDiagnosticSchema = z.object({
  code: z.string().min(1).max(64),
  path: z.string().min(1).max(128),
}).strict();

export const CorpusManifestValidationReportSchema = z.object({
  status: z.enum(["VALID", "INVALID"]),
  schemaVersion: z.literal(CORPUS_MANIFEST_SCHEMA_VERSION),
  manifestDigest: digest.optional(),
  diagnostics: z.array(CorpusManifestDiagnosticSchema).max(32),
}).strict();

export type CorpusManifestValidationReport = z.infer<typeof CorpusManifestValidationReportSchema>;

export interface CorpusCompositionAccount {
  documentsTotal: number;
  relationshipUnitsTotal: number;
  documentsByPartition: Record<CorpusPartition, number>;
  relationshipUnitsByPartition: Record<CorpusPartition, number>;
  documentsByLanguage: Record<CorpusLanguage, number>;
  relationshipUnitsByCategory: Record<CorpusCategory, number>;
  familyCount: number;
  plannedMinimums: {
    uniqueDocuments: 240;
    relationshipUnits: 385;
    evaluatedLanguageDocuments: 90;
    evaluatedDocumentsByLanguage: { en: 30; fr: 30; ar: 30 };
  };
  meetsPlannedMinimums: boolean;
}

type ManifestWithoutDigest = Omit<CorpusManifest, "manifestDigest">;

const partitions: CorpusPartition[] = ["development", "validation", "holdout"];
const languages: CorpusLanguage[] = ["en", "fr", "ar", "mixed", "unknown"];
const categories: CorpusCategory[] = [
  "exact_duplicates", "near_duplicates", "unrelated_articles", "syndicated_articles",
  "updated_articles", "evaluated_language", "mixed_language", "malformed_html",
  "boilerplate_heavy", "contradictory_sources", "common_event",
  "same_publisher_different_article", "different_publisher_same_event", "false_merge_traps",
  "false_split_traps", "canonical_url_variants", "tracking_parameter_variants",
  "unicode_normalization_edges", "empty_insufficient_content", "very_long_content",
];

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => compareCodePoints(left, right)));
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object") {
    return sortRecord(Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, canonicalValue(child)]),
    ));
  }
  return value;
}

export function serializeCanonicalCorpusManifest(value: ManifestWithoutDigest): string {
  return JSON.stringify(canonicalValue(value));
}

export function digestCanonicalCorpusManifest(value: ManifestWithoutDigest): string {
  return `sha256:${createHash("sha256").update(serializeCanonicalCorpusManifest(value), "utf8").digest("hex")}`;
}

function partitionSnapshot(manifest: ManifestWithoutDigest, selected: CorpusPartition): ManifestWithoutDigest {
  return {
    ...manifest,
    documents: manifest.documents.filter((document) => document.partition === selected),
    relationshipUnits: manifest.relationshipUnits.filter((unit) => unit.partition === selected),
    sealedPartitions: [],
  };
}

function partitionDigest(manifest: ManifestWithoutDigest, selected: CorpusPartition): string {
  return digestCanonicalCorpusManifest(partitionSnapshot(manifest, selected));
}

function normalizeManifest(input: CorpusManifestInput): ManifestWithoutDigest {
  const parsed = parsePhase5Contract(CorpusManifestSchema.partial({ manifestDigest: true }), input);
  return {
    schemaVersion: parsed.schemaVersion,
    corpusVersion: parsed.corpusVersion,
    algorithmVersion: parsed.algorithmVersion,
    governance: parsed.governance,
    documents: [...parsed.documents].map((document) => ({
      ...document,
      familyIds: [...document.familyIds].sort(compareCodePoints),
    })).sort((left, right) => compareCodePoints(left.sampleId, right.sampleId)),
    relationshipUnits: [...parsed.relationshipUnits].map((unit) => ({
      ...unit,
      sampleIds: [...unit.sampleIds].sort(compareCodePoints),
    })).sort((left, right) => compareCodePoints(left.unitId, right.unitId)),
    sealedPartitions: [...parsed.sealedPartitions].sort((left, right) => compareCodePoints(left.partition, right.partition)),
  };
}

function issue(code: string, path: string): CorpusManifestIssue {
  return { code, path };
}

function collectIssues(manifest: ManifestWithoutDigest): CorpusManifestIssue[] {
  const issues: CorpusManifestIssue[] = [];
  const documents = new Map<string, CorpusDocument>();
  const units = new Set<string>();
  const samplePartitions = new Map<string, CorpusPartition>();
  const familyPartitions = new Map<string, CorpusPartition>();
  for (const [index, document] of manifest.documents.entries()) {
    if (documents.has(document.sampleId)) issues.push(issue("duplicate_sample_id", `documents.${index}.sampleId`));
    documents.set(document.sampleId, document);
    const priorPartition = samplePartitions.get(document.sampleId);
    if (priorPartition !== undefined && priorPartition !== document.partition) issues.push(issue("sample_partition_conflict", `documents.${index}.partition`));
    samplePartitions.set(document.sampleId, document.partition);
    for (const familyId of document.familyIds) {
      const familyPartition = familyPartitions.get(familyId);
      if (familyPartition !== undefined && familyPartition !== document.partition) issues.push(issue("family_partition_leak", `documents.${index}.familyIds`));
      familyPartitions.set(familyId, document.partition);
    }
  }
  for (const [index, unit] of manifest.relationshipUnits.entries()) {
    if (units.has(unit.unitId)) issues.push(issue("duplicate_unit_id", `relationshipUnits.${index}.unitId`));
    units.add(unit.unitId);
    if (new Set(unit.sampleIds).size !== unit.sampleIds.length) issues.push(issue("duplicate_unit_sample_reference", `relationshipUnits.${index}.sampleIds`));
    const referenced = unit.sampleIds.map((sampleId) => documents.get(sampleId));
    if (referenced.some((document) => document === undefined)) issues.push(issue("unknown_sample_reference", `relationshipUnits.${index}.sampleIds`));
    if (referenced.some((document) => document !== undefined && document.partition !== unit.partition)) issues.push(issue("unit_partition_mismatch", `relationshipUnits.${index}.partition`));
  }
  const sealPartitions = new Set<CorpusPartition>();
  for (const [index, seal] of manifest.sealedPartitions.entries()) {
    if (sealPartitions.has(seal.partition)) issues.push(issue("duplicate_partition_seal", `sealedPartitions.${index}.partition`));
    sealPartitions.add(seal.partition);
    if (partitionDigest(manifest, seal.partition) !== seal.sealDigest) issues.push(issue("sealed_partition_mutated", `sealedPartitions.${index}.sealDigest`));
  }
  return issues.slice(0, 32);
}

export function validateCorpusManifest(input: unknown): CorpusManifest {
  const manifest = parsePhase5Contract(CorpusManifestSchema, input);
  const normalized = normalizeManifest(manifest);
  const issues = collectIssues(normalized);
  const expectedDigest = digestCanonicalCorpusManifest(normalized);
  if (manifest.manifestDigest !== expectedDigest) issues.push(issue("manifest_digest_mismatch", "manifestDigest"));
  if (issues.length > 0) throw new Phase5ContractValidationError(issues);
  return { ...normalized, manifestDigest: expectedDigest };
}

export function createCorpusManifest(input: Omit<CorpusManifestInput, "manifestDigest">): CorpusManifest {
  const normalized = normalizeManifest({ ...input, manifestDigest: `sha256:${"0".repeat(64)}` });
  const issues = collectIssues(normalized);
  if (issues.length > 0) throw new Phase5ContractValidationError(issues);
  return { ...normalized, manifestDigest: digestCanonicalCorpusManifest(normalized) };
}

export function inspectCorpusManifest(input: unknown): CorpusManifestValidationReport {
  try {
    const manifest = validateCorpusManifest(input);
    return parsePhase5Contract(CorpusManifestValidationReportSchema, {
      status: "VALID",
      schemaVersion: CORPUS_MANIFEST_SCHEMA_VERSION,
      manifestDigest: manifest.manifestDigest,
      diagnostics: [],
    });
  } catch (error) {
    const diagnostics = error instanceof Phase5ContractValidationError
      ? error.issues.map(({ code, path }) => ({ code, path }))
      : [{ code: "invalid_manifest", path: "manifest" }];
    return parsePhase5Contract(CorpusManifestValidationReportSchema, {
      status: "INVALID",
      schemaVersion: CORPUS_MANIFEST_SCHEMA_VERSION,
      diagnostics,
    });
  }
}

export function sealCorpusPartition(manifestInput: CorpusManifestInput, selected: CorpusPartition): CorpusManifest {
  const manifest = createCorpusManifest({ ...manifestInput, sealedPartitions: manifestInput.sealedPartitions.filter((seal) => seal.partition !== selected) });
  const withoutDigest = Object.fromEntries(
    Object.entries(manifest).filter(([key]) => key !== "manifestDigest"),
  ) as ManifestWithoutDigest;
  const sealed = {
    ...withoutDigest,
    sealedPartitions: [...withoutDigest.sealedPartitions, { partition: selected, sealDigest: partitionDigest(withoutDigest, selected) }],
  };
  return { ...sealed, manifestDigest: digestCanonicalCorpusManifest(sealed) };
}

export function accountCorpusComposition(input: CorpusManifest | unknown): CorpusCompositionAccount {
  const manifest = "manifestDigest" in Object(input) ? validateCorpusManifest(input) : createCorpusManifest(input as Omit<CorpusManifestInput, "manifestDigest">);
  const documentsByPartition = Object.fromEntries(partitions.map((key) => [key, 0])) as Record<CorpusPartition, number>;
  const relationshipUnitsByPartition = Object.fromEntries(partitions.map((key) => [key, 0])) as Record<CorpusPartition, number>;
  const documentsByLanguage = Object.fromEntries(languages.map((key) => [key, 0])) as Record<CorpusLanguage, number>;
  const relationshipUnitsByCategory = Object.fromEntries(categories.map((key) => [key, 0])) as Record<CorpusCategory, number>;
  const families = new Set<string>();
  for (const document of manifest.documents) {
    documentsByPartition[document.partition] += 1;
    documentsByLanguage[document.language] += 1;
    document.familyIds.forEach((familyId) => families.add(familyId));
  }
  for (const unit of manifest.relationshipUnits) {
    relationshipUnitsByPartition[unit.partition] += 1;
    relationshipUnitsByCategory[unit.category] += 1;
  }
  const evaluatedLanguageDocuments = documentsByLanguage.en + documentsByLanguage.fr + documentsByLanguage.ar;
  return {
    documentsTotal: manifest.documents.length,
    relationshipUnitsTotal: manifest.relationshipUnits.length,
    documentsByPartition,
    relationshipUnitsByPartition,
    documentsByLanguage,
    relationshipUnitsByCategory,
    familyCount: families.size,
    plannedMinimums: {
      uniqueDocuments: 240,
      relationshipUnits: 385,
      evaluatedLanguageDocuments: 90,
      evaluatedDocumentsByLanguage: { en: 30, fr: 30, ar: 30 },
    },
    meetsPlannedMinimums: manifest.documents.length >= 240
      && manifest.relationshipUnits.length >= 385
      && evaluatedLanguageDocuments >= 90
      && documentsByLanguage.en >= 30
      && documentsByLanguage.fr >= 30
      && documentsByLanguage.ar >= 30,
  };
}
