import { z } from "zod";

const iso = z.string().datetime({ offset: true });
const id = z.string().uuid();
const providerId = z.string().min(5).max(100);

export const PlanCodeSchema = z.enum(["FREE", "PRO"]);
export const SubscriptionStatusSchema = z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELED", "EXPIRED"]);
export const WebhookProcessingStatusSchema = z.enum(["RECEIVED", "PROCESSED", "IGNORED", "FAILED"]);
export const CommercialEventTypeSchema = z.enum([
  "PRICING_VIEWED", "CHECKOUT_STARTED", "CHECKOUT_COMPLETED",
  "SUBSCRIPTION_ACTIVATED", "SUBSCRIPTION_CANCELED", "PLAN_LIMIT_REACHED",
]);

export const BillingCustomerSchema = z.object({
  id, ownerId: id, email: z.string().email().max(320), displayName: z.string().trim().max(120).nullable(),
  paddleCustomerId: providerId.nullable(), checkoutCorrelationId: id,
  createdAt: iso, updatedAt: iso, schemaVersion: z.literal(1),
}).strict();

export const SubscriptionSchema = z.object({
  id, ownerId: id, billingCustomerId: id, paddleSubscriptionId: providerId,
  paddleTransactionId: providerId.nullable(), planCode: PlanCodeSchema,
  status: SubscriptionStatusSchema, currentPeriodStart: iso.nullable(), currentPeriodEnd: iso.nullable(),
  cancelAtPeriodEnd: z.boolean(), providerUpdatedAt: iso,
  createdAt: iso, updatedAt: iso, schemaVersion: z.literal(1),
}).strict();

export const EntitlementSchema = z.object({
  ownerId: id, effectivePlan: PlanCodeSchema, businessProfileLimit: z.number().int().positive(),
  monthlyDecisionBriefLimit: z.number().int().positive(), source: z.enum(["DEFAULT_FREE", "PADDLE_VERIFIED"]),
  effectiveAt: iso, expiresAt: iso.nullable(), diagnosticState: z.enum(["OK", "INCONSISTENT"]).default("OK"),
  schemaVersion: z.literal(1),
}).strict();

export const UsageCounterSchema = z.object({
  id: z.string().min(1).max(100), ownerId: id, periodKey: z.string().regex(/^\d{4}-\d{2}$/),
  decisionBriefCount: z.number().int().nonnegative(), createdAt: iso, updatedAt: iso, schemaVersion: z.literal(1),
}).strict();

export const BillingWebhookEventSchema = z.object({
  id: providerId, eventType: z.string().min(1).max(100), ownerId: id.nullable(),
  status: WebhookProcessingStatusSchema, occurredAt: iso, receivedAt: iso,
  processedAt: iso.nullable(), failureCategory: z.string().max(100).nullable(), schemaVersion: z.literal(1),
}).strict();

export const CommercialEventSchema = z.object({
  id, ownerId: id.nullable(), type: CommercialEventTypeSchema, occurredAt: iso,
  planCode: PlanCodeSchema.nullable(), schemaVersion: z.literal(1),
}).strict();

export type PlanCode = z.infer<typeof PlanCodeSchema>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export type BillingCustomer = z.infer<typeof BillingCustomerSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type Entitlement = z.infer<typeof EntitlementSchema>;
export type UsageCounter = z.infer<typeof UsageCounterSchema>;
export type BillingWebhookEvent = z.infer<typeof BillingWebhookEventSchema>;
export type CommercialEvent = z.infer<typeof CommercialEventSchema>;
