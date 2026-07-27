import { z } from "zod";

const MAX_REPORTED_ISSUES = 20;
const MAX_PATH_SEGMENTS = 8;
const MAX_PATH_SEGMENT_LENGTH = 64;

export interface Phase5ValidationIssue {
  code: string;
  path: string;
}

function safePath(path: PropertyKey[]): string {
  return path
    .slice(0, MAX_PATH_SEGMENTS)
    .map((segment) => String(segment).slice(0, MAX_PATH_SEGMENT_LENGTH))
    .join(".");
}

export class Phase5ContractValidationError extends Error {
  readonly issues: readonly Phase5ValidationIssue[];

  constructor(issues: readonly Phase5ValidationIssue[]) {
    super("Phase 5 contract validation failed.");
    this.name = "Phase5ContractValidationError";
    this.issues = issues.slice(0, MAX_REPORTED_ISSUES);
  }
}

export function parsePhase5Contract<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  throw new Phase5ContractValidationError(result.error.issues.map((issue) => ({
    code: issue.code,
    path: safePath(issue.path),
  })));
}
