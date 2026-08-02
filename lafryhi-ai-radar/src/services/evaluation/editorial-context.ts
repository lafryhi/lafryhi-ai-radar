import contextJson from "../../../eval/datasets/gemini-migration.editorial-context.json";
import { z } from "zod";

export const EvaluationEditorialPolicyContextSchema = z.object({
  evidenceState: z.enum(["SUFFICIENT", "INSUFFICIENT", "UNKNOWN"]),
  uncertaintyState: z.enum([
    "NONE",
    "SOURCE_CONFLICT",
    "PENDING_VERIFICATION",
    "EDITORIAL_DEFER",
    "POLICY_UNCERTAINTY",
    "HUMAN_REVIEW_ONLY",
    "EVIDENCE_INSUFFICIENT",
  ]),
  sourceAuthority: z.enum(["AUTHORITATIVE", "TRUSTED", "UNVERIFIED", "UNKNOWN"]),
  materialImpact: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]),
  confidenceQualified: z.boolean(),
  numericalClaimsVerified: z.boolean(),
}).strict();

const contextByCaseId = z.record(z.string().min(1), EvaluationEditorialPolicyContextSchema).parse(contextJson);

export function getEvaluationEditorialPolicyContext(caseId: string) {
  return contextByCaseId[caseId];
}

export function validateEvaluationEditorialPolicyContexts(caseIds: string[]) {
  const missing = caseIds.filter((caseId) => !contextByCaseId[caseId]);
  const unexpected = Object.keys(contextByCaseId).filter((caseId) => !caseIds.includes(caseId));
  if (missing.length || unexpected.length) {
    throw new Error(`Editorial policy context mismatch. Missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}.`);
  }
  return contextByCaseId;
}
