import { AnalysisResultSchema, GeminiAnalysisOutputSchema, type AnalysisResult, type SourceRecord } from "@/domain/schemas";
import type { AnalysisContext } from "./ai";
import {
  DuplicateIntegrityFailure,
  EvidenceIntegrityFailure,
  ResponseEnvelopeFailure,
  SchemaValidationFailure,
  safeZodIssues,
  type SafeFailureIssue,
} from "./failure-recovery";

export type LosslessRepairCode =
  | "unwrap_json_fence"
  | "trim_string"
  | "deduplicate_string"
  | "deduplicate_entity"
  | "deduplicate_related_article"
  | "derive_duplicate_reason"
  | "empty_opportunity_detail_to_null";

export interface LosslessRepair {
  code: LosslessRepairCode;
  path: string;
}

export interface ParsedEnvelope {
  value: unknown;
  repairs: LosslessRepair[];
}

export function parseAnalysisEnvelope(text: string): ParsedEnvelope {
  let json = text.replace(/^\uFEFF/, "").trim();
  const repairs: LosslessRepair[] = [];
  if (!json) throw new ResponseEnvelopeFailure();

  if (json.startsWith("```")) {
    const openingEnd = json.indexOf("\n");
    if (openingEnd < 0) throw new ResponseEnvelopeFailure();
    const opening = json.slice(0, openingEnd).trim();
    if (opening !== "```" && opening !== "```json") throw new ResponseEnvelopeFailure();
    const fencedBody = json.slice(openingEnd + 1);
    if (!fencedBody.endsWith("```")) throw new ResponseEnvelopeFailure();
    json = fencedBody.slice(0, -3).trim();
    if (!json || json.includes("```")) throw new ResponseEnvelopeFailure();
    repairs.push({ code: "unwrap_json_fence", path: "$" });
  }

  try {
    return { value: JSON.parse(json), repairs };
  } catch {
    throw new ResponseEnvelopeFailure();
  }
}

function trimString(value: unknown, path: string, repairs: LosslessRepair[]) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed !== value) repairs.push({ code: "trim_string", path });
  return trimmed;
}

function normalizeStringArray(value: unknown, path: string, repairs: LosslessRepair[]) {
  if (!Array.isArray(value)) return value;
  const seen = new Set<string>();
  return value.flatMap((entry, index) => {
    const normalized = trimString(entry, `${path}.${index}`, repairs);
    if (typeof normalized !== "string") return [normalized];
    if (seen.has(normalized)) {
      repairs.push({ code: "deduplicate_string", path: `${path}.${index}` });
      return [];
    }
    seen.add(normalized);
    return [normalized];
  });
}

function normalizeEvidence(value: unknown, repairs: LosslessRepair[]) {
  if (!Array.isArray(value)) return value;
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    const record = entry as Record<string, unknown>;
    return {
      ...record,
      quote: trimString(record.quote, `evidence.${index}.quote`, repairs),
      significance: trimString(record.significance, `evidence.${index}.significance`, repairs),
    };
  });
}

function normalizeEntities(value: unknown, repairs: LosslessRepair[]) {
  if (!Array.isArray(value)) return value;
  const normalizedEntries = value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    const record = entry as Record<string, unknown>;
    return {
      ...record,
      name: trimString(record.name, `entities.${index}.name`, repairs),
      normalizedName: trimString(record.normalizedName, `entities.${index}.normalizedName`, repairs),
    };
  });
  const identities = new Map<string, string>();
  normalizedEntries.forEach((normalized, index) => {
    if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return;
    const record = normalized as Record<string, unknown>;
    if (typeof record.normalizedName !== "string" || typeof record.type !== "string") return;
    const identity = `${record.type}\u0000${record.normalizedName}`;
    const signature = stableSignature(record);
    const previous = identities.get(identity);
    if (previous && previous !== signature) {
      throw new DuplicateIntegrityFailure([{
        path: `entities.${index}`,
        code: "conflicting_duplicate_entity",
      }]);
    }
    identities.set(identity, signature);
  });
  const seen = new Set<string>();
  return normalizedEntries.flatMap((normalized, index) => {
    if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return [normalized];
    const record = normalized as Record<string, unknown>;
    if (typeof record.normalizedName !== "string" || typeof record.type !== "string") return [record];
    const signature = stableSignature(record);
    if (seen.has(signature)) {
      repairs.push({ code: "deduplicate_entity", path: `entities.${index}` });
      return [];
    }
    seen.add(signature);
    return [record];
  });
}

function stableSignature(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSignature).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableSignature(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function normalizeOpportunity(value: unknown, repairs: LosslessRepair[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const result = { ...(value as Record<string, unknown>) };
  if (result.isOpportunity === false) {
    for (const field of ["deadline", "eligibility", "benefit", "effortEstimate"]) {
      if (typeof result[field] === "string" && result[field].trim() === "") {
        result[field] = null;
        repairs.push({ code: "empty_opportunity_detail_to_null", path: `opportunity.${field}` });
      }
    }
  }
  return result;
}

function normalizeDuplicateAnalysis(value: unknown, repairs: LosslessRepair[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const duplicate = { ...(value as Record<string, unknown>) };
  if (Array.isArray(duplicate.relatedPreviousArticles)) {
    const normalizedEntries = duplicate.relatedPreviousArticles.map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
      const article = entry as Record<string, unknown>;
      return {
        ...article,
        sourceRecordId: trimString(article.sourceRecordId, `duplicateAnalysis.relatedPreviousArticles.${index}.sourceRecordId`, repairs),
        title: trimString(article.title, `duplicateAnalysis.relatedPreviousArticles.${index}.title`, repairs),
        sourceUrl: trimString(article.sourceUrl, `duplicateAnalysis.relatedPreviousArticles.${index}.sourceUrl`, repairs),
        reason: trimString(article.reason, `duplicateAnalysis.relatedPreviousArticles.${index}.reason`, repairs),
      };
    });
    const identities = new Map<string, string>();
    normalizedEntries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
      const article = entry as Record<string, unknown>;
      if (typeof article.sourceRecordId !== "string") return;
      const signature = stableSignature(article);
      const previous = identities.get(article.sourceRecordId);
      if (previous && previous !== signature) {
        throw new DuplicateIntegrityFailure([{
          path: `duplicateAnalysis.relatedPreviousArticles.${index}`,
          code: "conflicting_duplicate_related_article",
        }]);
      }
      identities.set(article.sourceRecordId, signature);
    });
    const seen = new Set<string>();
    duplicate.relatedPreviousArticles = normalizedEntries.flatMap((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [entry];
      const article = entry as Record<string, unknown>;
      const signature = stableSignature(article);
      if (seen.has(signature)) {
        repairs.push({ code: "deduplicate_related_article", path: `duplicateAnalysis.relatedPreviousArticles.${index}` });
        return [];
      }
      seen.add(signature);
      return [article];
    });
  }
  if (duplicate.classification !== "unique" && duplicate.duplicateReason == null && Array.isArray(duplicate.relatedPreviousArticles)) {
    const reasons = duplicate.relatedPreviousArticles.flatMap((entry) =>
      entry && typeof entry === "object" && !Array.isArray(entry) && typeof (entry as Record<string, unknown>).reason === "string"
        ? [(entry as Record<string, unknown>).reason as string]
        : []);
    const derived = reasons.join(" ");
    if (derived && derived.length <= 800) {
      duplicate.duplicateReason = derived;
      repairs.push({ code: "derive_duplicate_reason", path: "duplicateAnalysis.duplicateReason" });
    }
  } else {
    duplicate.duplicateReason = trimString(duplicate.duplicateReason, "duplicateAnalysis.duplicateReason", repairs);
  }
  return duplicate;
}

export function applyLosslessRepairs(value: unknown) {
  const repairs: LosslessRepair[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { value, repairs };
  const output = { ...(value as Record<string, unknown>) };
  const stringFields = ["summary", "whyItMatters", "recommendedAction", "reasoning"] as const;
  for (const field of stringFields) output[field] = trimString(output[field], field, repairs);
  const arrayFields = [
    "keyPoints", "targetAudience", "relatedTopics", "mentionedCompanies", "mentionedProducts",
    "mentionedTechnologies", "potentialRisks", "warnings",
  ] as const;
  for (const field of arrayFields) output[field] = normalizeStringArray(output[field], field, repairs);
  output.entities = normalizeEntities(output.entities, repairs);
  output.evidence = normalizeEvidence(output.evidence, repairs);
  output.opportunity = normalizeOpportunity(output.opportunity, repairs);
  output.duplicateAnalysis = normalizeDuplicateAnalysis(output.duplicateAnalysis, repairs);
  return { value: output, repairs };
}

function normalizedEvidenceText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function validateEvidenceIntegrity(result: AnalysisResult, source: SourceRecord) {
  const sourceText = normalizedEvidenceText(source.normalizedText);
  const issues: SafeFailureIssue[] = [];
  result.evidence.forEach((entry, index) => {
    if (!sourceText.includes(normalizedEvidenceText(entry.quote))) {
      issues.push({ path: `evidence.${index}.quote`, code: "quote_not_in_source" });
    }
  });
  if (issues.length) throw new EvidenceIntegrityFailure(issues);
}

export function validateDuplicateIntegrity(result: AnalysisResult, context: AnalysisContext) {
  const issues: SafeFailureIssue[] = [];
  const duplicate = result.duplicateAnalysis;
  if (duplicate.classification === "unique") {
    if (duplicate.relatedPreviousArticles.length > 0) {
      issues.push({ path: "duplicateAnalysis.relatedPreviousArticles", code: "unique_has_related_articles" });
    }
    if (duplicate.duplicateReason !== null) {
      issues.push({ path: "duplicateAnalysis.duplicateReason", code: "unique_has_duplicate_reason" });
    }
  }
  const previousById = new Map(context.previousArticles.map((article) => [article.sourceRecordId, article]));
  duplicate.relatedPreviousArticles.forEach((article, index) => {
    const previous = previousById.get(article.sourceRecordId);
    if (!previous) {
      issues.push({ path: `duplicateAnalysis.relatedPreviousArticles.${index}.sourceRecordId`, code: "reference_not_in_context" });
      return;
    }
    if (previous.title !== article.title) {
      issues.push({ path: `duplicateAnalysis.relatedPreviousArticles.${index}.title`, code: "reference_title_mismatch" });
    }
    if (previous.sourceUrl !== article.sourceUrl) {
      issues.push({ path: `duplicateAnalysis.relatedPreviousArticles.${index}.sourceUrl`, code: "reference_url_mismatch" });
    }
  });
  if (issues.length) throw new DuplicateIntegrityFailure(issues);
}

export function validateAndDeriveAnalysis(
  value: unknown,
  source: SourceRecord,
  context: AnalysisContext,
  calculateRelevanceScore: (result: ReturnType<typeof GeminiAnalysisOutputSchema.parse>) => number,
) {
  const parsed = GeminiAnalysisOutputSchema.safeParse(value);
  if (!parsed.success) throw new SchemaValidationFailure(safeZodIssues(parsed.error.issues));
  const result = AnalysisResultSchema.parse({
    ...parsed.data,
    relevanceScore: calculateRelevanceScore(parsed.data),
  });
  validateEvidenceIntegrity(result, source);
  validateDuplicateIntegrity(result, context);
  return result;
}
