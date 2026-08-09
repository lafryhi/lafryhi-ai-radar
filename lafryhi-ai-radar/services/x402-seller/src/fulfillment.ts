import { randomUUID } from "node:crypto";
import {
  SERVICE_ID,
  SERVICE_NAME,
  SERVICE_VERSION,
  type DecisionBriefRequest,
  type FulfillmentArtifact,
  type PublicVerifiedItem,
  type SellerReceipt,
  type VerifiedPayment,
} from "./contracts.js";
import { digest } from "./crypto.js";

export function buildFulfillment(
  request: DecisionBriefRequest,
  payment: VerifiedPayment,
  items: PublicVerifiedItem[],
  now: string,
): FulfillmentArtifact {
  const noResult = items.length === 0;
  const core = {
    briefId: `brief-${randomUUID()}`,
    serviceId: SERVICE_ID,
    serviceVersion: SERVICE_VERSION,
    topic: request.topic,
    verifiedTitle: noResult
      ? "No matching human-verified Radar item"
      : items.map((item) => item.verifiedTitle).join(" | "),
    verifiedSummary: noResult
      ? "No public, approved, human-verified Radar item matched this request. No intelligence was invented."
      : items.map((item) => item.verifiedSummary).join("\n"),
    verifiedSignals: items.flatMap((item) => item.verifiedSignals),
    sourceReferences: items.flatMap((item) => item.sourceReferences),
    verificationStatus: noResult
      ? ("NO_MATCHING_VERIFIED_CONTENT" as const)
      : ("HUMAN_VERIFIED" as const),
    verificationTimestamp: noResult
      ? null
      : items
          .map((item) => item.verificationTimestamp)
          .sort()
          .at(-1)!,
    businessImpact: items.flatMap((item) => item.businessImpact),
    risks: items.flatMap((item) => item.risks),
    opportunities: items.flatMap((item) => item.opportunities),
    recommendations: items.flatMap((item) => item.recommendations),
    confidence: noResult
      ? null
      : Math.min(...items.map((item) => item.confidence)),
    suggestedPromotionalAngle: noResult
      ? null
      : `Use verified evidence about ${request.topic}; do not overstate certainty.`,
    suggestedNarrationOutline: noResult
      ? []
      : [
          "Verified signal",
          "Business impact",
          "Risks and opportunities",
          "Recommended next step",
        ],
    buyerAgentReference: request.buyerAgentReference,
    businessGoalReference: request.businessGoalReference,
    paymentReference: payment.paymentReference,
    generatedAt: now,
    fulfillmentStatus: "FULFILLMENT_DELIVERED" as const,
  };
  return { ...core, fulfillmentDigest: digest(core) };
}

export function buildReceipt(
  request: DecisionBriefRequest,
  payment: VerifiedPayment,
  artifact: FulfillmentArtifact,
  requestFingerprint: string,
  sellerWallet: string | null,
  now: string,
): SellerReceipt {
  return {
    serviceId: SERVICE_ID,
    serviceVersion: SERVICE_VERSION,
    buyerAgentReference: request.buyerAgentReference,
    businessGoalReference: request.businessGoalReference,
    paymentReference: payment.paymentReference,
    payerPublicReference: payment.payerPublicReference ?? null,
    sellerPublicWallet: sellerWallet,
    amount: payment.amount,
    currency: payment.currency,
    network: payment.network,
    requestFingerprint,
    fulfillmentDigest: artifact.fulfillmentDigest,
    authorizationVerificationStatus: "AUTHORIZATION_VERIFIED",
    settlementStatus: payment.settlementStatus,
    createdAt: now,
    fulfilledAt: now,
  };
}

export const serviceDescription = SERVICE_NAME;
