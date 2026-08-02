import type { ModelCaseResult } from "./types";

export const CONFLICTING_REVIEW_ACTION_STATUS = 409;

export function mayEnterPublicFeed(reviewStatus: "pending" | "approved" | "rejected" | "needs_changes") {
  return reviewStatus === "approved";
}

export function evaluationInvariantViolations(
  productionBefore: ModelCaseResult,
  productionAfter: ModelCaseResult,
  capabilities: {
    firestoreWrites: boolean;
    publicationCalls: boolean;
    cookieWrites: boolean;
    sessionWrites: boolean;
    publicApiExposure: boolean;
  },
) {
  const violations: string[] = [];
  if (JSON.stringify(productionBefore) !== JSON.stringify(productionAfter)) violations.push("candidate altered production decision");
  if (capabilities.firestoreWrites) violations.push("candidate can write to Firestore");
  if (capabilities.publicationCalls) violations.push("candidate can call publishing code");
  if (capabilities.cookieWrites) violations.push("candidate can modify cookies");
  if (capabilities.sessionWrites) violations.push("candidate can modify sessions");
  if (capabilities.publicApiExposure) violations.push("candidate can leak through public APIs");
  return violations;
}
