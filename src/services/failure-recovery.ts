import type { ZodIssue } from "zod";

export const AnalysisFailureCategories = [
  "response_envelope",
  "schema_validation",
  "evidence_integrity",
  "duplicate_integrity",
  "provider_transient",
  "provider_permanent",
  "internal_invariant",
] as const;

export type AnalysisFailureCategory = typeof AnalysisFailureCategories[number];
export type RecoveryDecision = "repair" | "regenerate" | "retry" | "fail";

export interface SafeFailureIssue {
  path: string;
  code: string;
}

export class AnalysisFailure extends Error {
  constructor(
    message: string,
    readonly category: AnalysisFailureCategory,
    readonly issues: SafeFailureIssue[] = [],
  ) {
    super(message);
    this.name = "AnalysisFailure";
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

export function safeZodIssues(issues: ZodIssue[]): SafeFailureIssue[] {
  return issues.slice(0, 25).map((issue) => ({
    path: issue.path.map(String).join(".") || "$",
    code: issue.code,
  }));
}

export function decideRecovery(failure: AnalysisFailure): RecoveryDecision {
  switch (failure.category) {
    case "response_envelope":
    case "schema_validation":
    case "evidence_integrity":
    case "duplicate_integrity":
      return "regenerate";
    case "provider_transient":
      return "retry";
    case "provider_permanent":
    case "internal_invariant":
      return "fail";
  }
}

export function aiRecoveryEnabled(value: string | undefined = process.env.AI_RECOVERY_ENABLED) {
  return value === "true";
}
