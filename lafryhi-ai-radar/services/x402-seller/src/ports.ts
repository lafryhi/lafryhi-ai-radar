import type {
  DecisionBriefRequest,
  FulfillmentArtifact,
  PublicVerifiedItem,
  SellerReceipt,
  VerifiedPayment,
} from "./contracts.js";

export interface VerifiedRadarContentPort {
  findVerified(request: DecisionBriefRequest): Promise<PublicVerifiedItem[]>;
}
export interface PaymentContext {
  authorizationHeader?: string;
  serviceId: string;
  serviceVersion: string;
}
export type PaymentDecision =
  | { kind: "required"; paymentRequiredHeader?: string }
  | { kind: "invalid"; reason: string }
  | { kind: "verified"; payment: VerifiedPayment };
export interface SellerPaymentVerifierPort {
  verify(context: PaymentContext): Promise<PaymentDecision>;
}
export interface FulfillmentRecord {
  paymentReference: string;
  requestFingerprint: string;
  buyerAgentReference: string;
  businessGoalReference: string;
  serviceVersion: string;
  fulfillmentDigest: string;
  fulfillmentStatus: "FULFILLMENT_DELIVERED";
  artifact: FulfillmentArtifact;
  receipt: SellerReceipt;
  createdAt: string;
  updatedAt: string;
}
export type ClaimResult =
  | { kind: "claimed" }
  | { kind: "existing"; record: FulfillmentRecord }
  | { kind: "conflict" };
export interface FulfillmentRepositoryPort {
  claim(
    paymentReference: string,
    requestFingerprint: string,
  ): Promise<ClaimResult>;
  complete(record: FulfillmentRecord): Promise<void>;
  release(paymentReference: string, requestFingerprint: string): Promise<void>;
}
