import type { ZodIssue } from "zod";

export const AnalysisFailureCategories = [
  "response_envelope",
  "schema_validation",
  "evidence_integrity",
  "duplicate_integrity",
  "empty_output",
  "response_truncated",
  "provider_transient",
  "provider_permanent",
  "internal_invariant",
] as const;

export type AnalysisFailureCategory = typeof AnalysisFailureCategories[number];

export interface SafeFailureIssue {
  path: string;
  code: string;
  evidenceMismatch?: EvidenceMismatchDiagnostic;
}

export const EvidenceMismatchClassifications = [
  "whitespace",
  "case",
  "unicode_normalization",
  "punctuation",
  "absent",
  "unknown",
] as const;

export type EvidenceMismatchClassification = typeof EvidenceMismatchClassifications[number];

export interface EvidenceMismatchDiagnostic {
  quoteLength: number;
  longestMatchingPrefixLength: number;
  longestMatchingSuffixLength: number;
  mismatchClassification: EvidenceMismatchClassification;
}

export class AnalysisFailure extends Error {
  retryCount = 0;
  regenerationCount = 0;

  constructor(
    message: string,
    readonly category: AnalysisFailureCategory,
    readonly issues: SafeFailureIssue[] = [],
  ) {
    super(message);
    this.name = "AnalysisFailure";
  }

  withRecoveryState(retryCount: number, regenerationCount: number): this {
    this.retryCount = retryCount;
    this.regenerationCount = regenerationCount;
    return this;
  }
}

export class ResponseEnvelopeFailure extends AnalysisFailure {
  constructor() {
    super("Gemini returned malformed JSON.", "response_envelope");
    this.name = "ResponseEnvelopeFailure";
  }
}

export class SchemaValidationFailure extends AnalysisFailure {
  constructor(issues: SafeFailureIssue[]) {
    super("Gemini output failed schema validation.", "schema_validation", issues);
    this.name = "SchemaValidationFailure";
  }
}

export class EvidenceIntegrityFailure extends AnalysisFailure {
  constructor(issues: SafeFailureIssue[]) {
    super("Gemini evidence failed source integrity validation.", "evidence_integrity", issues);
    this.name = "EvidenceIntegrityFailure";
  }
}

export class DuplicateIntegrityFailure extends AnalysisFailure {
  constructor(issues: SafeFailureIssue[]) {
    super("Gemini duplicate analysis failed context integrity validation.", "duplicate_integrity", issues);
    this.name = "DuplicateIntegrityFailure";
  }
}

export class EmptyOutputFailure extends AnalysisFailure {
  constructor() {
    super("Vertex AI returned no text.", "empty_output");
    this.name = "EmptyOutputFailure";
  }
}

export class ResponseTruncatedFailure extends AnalysisFailure {
  constructor() {
    super("Gemini response was truncated after reaching max output tokens.", "response_truncated");
    this.name = "ResponseTruncatedFailure";
  }
}

export class ProviderFailure extends AnalysisFailure {
  constructor(
    category: "provider_transient" | "provider_permanent",
    readonly providerStatus: number | null,
    readonly retryAfterMs: number | null,
  ) {
    super(
      category === "provider_transient"
        ? "Gemini provider request failed temporarily."
        : "Gemini provider request failed permanently.",
      category,
    );
    this.name = "ProviderFailure";
  }
}

export type RecoveryAction = "retry_identical" | "regenerate_compact" | "regenerate_correction" | "terminal";

const RECOVERY_DECISIONS: Readonly<Record<AnalysisFailureCategory, RecoveryAction>> = Object.freeze({
  response_envelope: "regenerate_correction",
  schema_validation: "regenerate_correction",
  evidence_integrity: "regenerate_correction",
  duplicate_integrity: "regenerate_correction",
  empty_output: "regenerate_compact",
  response_truncated: "regenerate_compact",
  provider_transient: "retry_identical",
  provider_permanent: "terminal",
  internal_invariant: "terminal",
});

export function decideRecovery(failure: AnalysisFailure): RecoveryAction {
  return RECOVERY_DECISIONS[failure.category];
}

const TEMPORARY_NETWORK_CODES = new Set([
  "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENETUNREACH", "EHOSTUNREACH",
  "ECONNREFUSED", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT",
]);

function retryAfterValue(error: Record<string, unknown>) {
  const direct = error.retryAfter;
  if (typeof direct === "number" || typeof direct === "string") return direct;
  const response = error.response;
  if (!response || typeof response !== "object") return null;
  const headers = (response as Record<string, unknown>).headers;
  if (!headers || typeof headers !== "object") return null;
  const getter = (headers as { get?: (name: string) => unknown }).get;
  return typeof getter === "function" ? getter.call(headers, "retry-after") : null;
}

function parseRetryAfter(value: unknown, nowMs: number) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value * 1000);
  if (typeof value !== "string") return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - nowMs);
}

function retryAfterMilliseconds(error: Record<string, unknown>, nowMs: number) {
  if (typeof error.retryAfterMs === "number" && Number.isFinite(error.retryAfterMs) && error.retryAfterMs >= 0) {
    return Math.round(error.retryAfterMs);
  }
  return parseRetryAfter(retryAfterValue(error), nowMs);
}

export function classifyProviderFailure(error: unknown, nowMs: number): ProviderFailure {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const status = typeof record.status === "number"
    ? record.status
    : typeof record.statusCode === "number"
      ? record.statusCode
      : null;
  const name = typeof record.name === "string" ? record.name : "";
  const code = typeof record.code === "string" ? record.code : "";
  const cause = record.cause && typeof record.cause === "object"
    ? record.cause as Record<string, unknown>
    : {};
  const causeName = typeof cause.name === "string" ? cause.name : "";
  const causeCode = typeof cause.code === "string" ? cause.code : "";
  const transient = status === 429 || (status !== null && status >= 500 && status <= 599)
    || name === "TimeoutError" || name === "AbortError"
    || causeName === "TimeoutError" || causeName === "AbortError"
    || TEMPORARY_NETWORK_CODES.has(code) || TEMPORARY_NETWORK_CODES.has(causeCode);
  return new ProviderFailure(
    transient ? "provider_transient" : "provider_permanent",
    status,
    transient ? retryAfterMilliseconds(record, nowMs) : null,
  );
}

export function safeZodIssues(issues: ZodIssue[]): SafeFailureIssue[] {
  return issues.slice(0, 25).map((issue) => ({
    path: issue.path.map(String).join(".") || "$",
    code: issue.code,
  }));
}

export function aiRecoveryEnabled(value: string | undefined = process.env.AI_RECOVERY_ENABLED) {
  return value === "true";
}
