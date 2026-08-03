import { z } from "zod";

export const SERVICE_ID = "lafryhi-ai-radar-decision-brief";
export const SERVICE_VERSION = "1.0.0";
export const SERVICE_NAME =
  "LAFRYHI AI Radar — AI Business Signal Decision Brief";
export const CATEGORY = "BUSINESS_DECISION_INTELLIGENCE";
export const evidenceStatuses = [
  "PAYMENT_REQUIRED",
  "AUTHORIZATION_VERIFIED",
  "FULFILLMENT_DELIVERED",
  "SETTLEMENT_PENDING",
  "SETTLEMENT_CONFIRMED",
  "EXPLORER_PROOF_AVAILABLE",
  "PENDING_REAL_PROOF",
] as const;

export const DecisionBriefRequestSchema = z.strictObject({
  topic: z.string().trim().min(3).max(240),
  targetLanguage: z.enum(["en", "fr", "ar"]),
  targetAudience: z.string().trim().min(2).max(120),
  requestedFormat: z.enum(["structured-json", "executive-brief"]),
  maximumItemCount: z.number().int().min(1).max(5),
  businessGoalReference: z
    .string()
    .trim()
    .min(3)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/),
  buyerAgentReference: z
    .string()
    .trim()
    .min(3)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/),
});
export type DecisionBriefRequest = z.infer<typeof DecisionBriefRequestSchema>;

export const PublicVerifiedItemSchema = z.strictObject({
  id: z.string().min(1).max(128),
  topicTags: z.array(z.string().min(1).max(80)).max(20),
  verifiedTitle: z.string().min(1).max(240),
  verifiedSummary: z.string().min(1).max(2_000),
  verifiedSignals: z.array(z.string().min(1).max(500)).min(1).max(10),
  sourceReferences: z
    .array(
      z.strictObject({
        title: z.string().min(1).max(240),
        url: z.string().url().max(2_048),
        publishedAt: z.string().datetime().nullable(),
      }),
    )
    .min(1)
    .max(10),
  publicationStatus: z.literal("published"),
  reviewStatus: z.literal("approved"),
  humanReviewRequired: z.literal(true),
  verificationTimestamp: z.string().datetime(),
  publiclyEligible: z.literal(true),
  businessImpact: z.array(z.string().min(1).max(500)).max(10),
  risks: z.array(z.string().min(1).max(500)).max(10),
  opportunities: z.array(z.string().min(1).max(500)).max(10),
  recommendations: z.array(z.string().min(1).max(500)).max(10),
  confidence: z.number().min(0).max(1),
});
export type PublicVerifiedItem = z.infer<typeof PublicVerifiedItemSchema>;

export type EvidenceStatus = (typeof evidenceStatuses)[number];
export interface VerifiedPayment {
  paymentReference: string;
  payerPublicReference?: string;
  amount: string;
  currency: "USDC";
  network: string;
  authorizationStatus: "AUTHORIZATION_VERIFIED";
  settlementStatus: "SETTLEMENT_PENDING" | "SETTLEMENT_CONFIRMED";
  transaction?: string;
}

export interface FulfillmentArtifact {
  briefId: string;
  serviceId: string;
  serviceVersion: string;
  topic: string;
  verifiedTitle: string;
  verifiedSummary: string;
  verifiedSignals: string[];
  sourceReferences: Array<{
    title: string;
    url: string;
    publishedAt: string | null;
  }>;
  verificationStatus: "HUMAN_VERIFIED" | "NO_MATCHING_VERIFIED_CONTENT";
  verificationTimestamp: string | null;
  businessImpact: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  confidence: number | null;
  suggestedPromotionalAngle: string | null;
  suggestedNarrationOutline: string[];
  buyerAgentReference: string;
  businessGoalReference: string;
  paymentReference: string;
  generatedAt: string;
  fulfillmentDigest: string;
  fulfillmentStatus: "FULFILLMENT_DELIVERED";
}

export interface SellerReceipt {
  serviceId: string;
  serviceVersion: string;
  buyerAgentReference: string;
  businessGoalReference: string;
  paymentReference: string;
  payerPublicReference: string | null;
  sellerPublicWallet: string | null;
  amount: string;
  currency: "USDC";
  network: string;
  requestFingerprint: string;
  fulfillmentDigest: string;
  authorizationVerificationStatus: "AUTHORIZATION_VERIFIED";
  settlementStatus: "SETTLEMENT_PENDING" | "SETTLEMENT_CONFIRMED";
  createdAt: string;
  fulfilledAt: string;
}
