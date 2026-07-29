import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  BillingCustomerSchema, BillingWebhookEventSchema, CommercialEventSchema, EntitlementSchema,
  SubscriptionSchema, UsageCounterSchema, type Entitlement, type PlanCode, type SubscriptionStatus,
} from "@/domain/billing";
import type { RadarRepository } from "@/persistence/repository";

export const PLAN_LIMITS = {
  FREE: { businessProfiles: 1, monthlyDecisionBriefs: 3, monthlyPriceCents: 0 },
  PRO: { businessProfiles: 3, monthlyDecisionBriefs: 50, monthlyPriceCents: 900 },
} as const;

export class BillingError extends Error {
  constructor(message: string, readonly code: "INVALID_INPUT" | "NOT_CONFIGURED" | "FORBIDDEN" | "PLAN_LIMIT_REACHED" | "PROVIDER_ERROR") { super(message); }
}

export const utcPeriodKey = (date = new Date()) => date.toISOString().slice(0, 7);
const counterId = (ownerId: string, periodKey: string) => `${ownerId}_${periodKey}`;

export function mapPaddleStatus(value: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    trialing: "TRIALING", active: "ACTIVE", past_due: "PAST_DUE",
    paused: "PAUSED", canceled: "CANCELED", expired: "EXPIRED",
  };
  return map[value] ?? "EXPIRED";
}

export function defaultEntitlement(ownerId: string, now = new Date().toISOString()): Entitlement {
  return EntitlementSchema.parse({
    ownerId, effectivePlan: "FREE", businessProfileLimit: PLAN_LIMITS.FREE.businessProfiles,
    monthlyDecisionBriefLimit: PLAN_LIMITS.FREE.monthlyDecisionBriefs, source: "DEFAULT_FREE",
    effectiveAt: now, expiresAt: null, diagnosticState: "OK", schemaVersion: 1,
  });
}

export async function resolveEntitlement(repository: RadarRepository, ownerId: string, now = new Date().toISOString()) {
  const [stored, subscription] = await Promise.all([repository.getEntitlement(ownerId), repository.findSubscriptionByOwner(ownerId)]);
  if (!stored || !subscription) return defaultEntitlement(ownerId, now);
  const active = subscription.status === "ACTIVE" || subscription.status === "TRIALING";
  if (!active || stored.effectivePlan !== "PRO" || stored.source !== "PADDLE_VERIFIED") return defaultEntitlement(ownerId, now);
  if (stored.expiresAt && stored.expiresAt <= now) return defaultEntitlement(ownerId, now);
  return stored;
}

export async function billingSnapshot(repository: RadarRepository, ownerId: string, now = new Date()) {
  const periodKey = utcPeriodKey(now);
  const [entitlement, subscription, profiles, usage] = await Promise.all([
    resolveEntitlement(repository, ownerId, now.toISOString()),
    repository.findSubscriptionByOwner(ownerId),
    repository.listBusinessProfilesByOwner(ownerId, 100),
    repository.getUsageCounter(ownerId, periodKey),
  ]);
  return {
    plan: entitlement.effectivePlan, entitlement, subscription,
    businessProfileUsage: profiles.length,
    decisionBriefUsage: usage?.decisionBriefCount ?? 0,
    periodKey,
  };
}

export async function assertBusinessProfileCapacity(repository: RadarRepository, ownerId: string, existingId?: string) {
  if (existingId) return;
  const [entitlement, profiles] = await Promise.all([resolveEntitlement(repository, ownerId), repository.listBusinessProfilesByOwner(ownerId, 100)]);
  if (profiles.length >= entitlement.businessProfileLimit) {
    await recordCommercialEvent(repository, ownerId, "PLAN_LIMIT_REACHED", entitlement.effectivePlan);
    throw new BillingError(`Business Profile limit reached (${profiles.length}/${entitlement.businessProfileLimit}).`, "PLAN_LIMIT_REACHED");
  }
}

export async function assertDecisionCapacity(repository: RadarRepository, ownerId: string, now = new Date()) {
  const entitlement = await resolveEntitlement(repository, ownerId, now.toISOString());
  const counter = await repository.getUsageCounter(ownerId, utcPeriodKey(now));
  const used = counter?.decisionBriefCount ?? 0;
  if (used >= entitlement.monthlyDecisionBriefLimit) {
    await recordCommercialEvent(repository, ownerId, "PLAN_LIMIT_REACHED", entitlement.effectivePlan);
    throw new BillingError(`Monthly Decision Brief limit reached (${used}/${entitlement.monthlyDecisionBriefLimit}).`, "PLAN_LIMIT_REACHED");
  }
  return { entitlement, used };
}

export async function countSuccessfulDecision(repository: RadarRepository, ownerId: string, now = new Date()) {
  const periodKey = utcPeriodKey(now);
  const current = await repository.getUsageCounter(ownerId, periodKey);
  await repository.saveUsageCounter(UsageCounterSchema.parse({
    id: counterId(ownerId, periodKey), ownerId, periodKey,
    decisionBriefCount: (current?.decisionBriefCount ?? 0) + 1,
    createdAt: current?.createdAt ?? now.toISOString(), updatedAt: now.toISOString(), schemaVersion: 1,
  }));
}

export async function recordCommercialEvent(
  repository: RadarRepository, ownerId: string | null,
  type: "PRICING_VIEWED" | "CHECKOUT_STARTED" | "CHECKOUT_COMPLETED" | "SUBSCRIPTION_ACTIVATED" | "SUBSCRIPTION_CANCELED" | "PLAN_LIMIT_REACHED",
  planCode: PlanCode | null,
  now = new Date().toISOString(),
) {
  await repository.saveCommercialEvent(CommercialEventSchema.parse({ id: crypto.randomUUID(), ownerId, type, occurredAt: now, planCode, schemaVersion: 1 }));
}

const paddleConfigurationSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  clientToken: z.string().min(8), apiKey: z.string().min(8), webhookSecret: z.string().min(8),
  proPriceId: z.string().startsWith("pri_"), defaultCheckoutUrl: z.string().url(),
});

export function getPaddleConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const parsed = paddleConfigurationSchema.safeParse({
    environment: env.PADDLE_ENVIRONMENT, clientToken: env.PADDLE_CLIENT_TOKEN,
    apiKey: env.PADDLE_API_KEY, webhookSecret: env.PADDLE_WEBHOOK_SECRET,
    proPriceId: env.PADDLE_PRO_PRICE_ID, defaultCheckoutUrl: env.PADDLE_DEFAULT_CHECKOUT_URL,
  });
  if (!parsed.success) throw new BillingError("Billing is not configured.", "NOT_CONFIGURED");
  return parsed.data;
}

export async function initiateCheckout(repository: RadarRepository, ownerId: string, input: unknown, now = new Date().toISOString()) {
  const parsed = z.object({ plan: z.literal("PRO"), email: z.string().trim().email().max(320), displayName: z.string().trim().max(120).optional() }).strict().safeParse(input);
  if (!parsed.success) throw new BillingError("Enter a valid billing email.", "INVALID_INPUT");
  const config = getPaddleConfiguration();
  const existing = await repository.findBillingCustomerByOwner(ownerId);
  const customer = BillingCustomerSchema.parse({
    id: existing?.id ?? crypto.randomUUID(), ownerId, email: parsed.data.email,
    displayName: parsed.data.displayName || null, paddleCustomerId: existing?.paddleCustomerId ?? null,
    checkoutCorrelationId: crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now, schemaVersion: 1,
  });
  await repository.saveBillingCustomer(customer);
  await recordCommercialEvent(repository, ownerId, "CHECKOUT_STARTED", "PRO", now);
  return {
    environment: config.environment, clientToken: config.clientToken,
    priceId: config.proPriceId, email: customer.email,
    successUrl: `${config.defaultCheckoutUrl.replace(/\/$/, "")}/billing/success`,
    customData: { billing_customer_id: customer.id, checkout_correlation_id: customer.checkoutCorrelationId, plan_code: "PRO" },
  };
}

export function verifyPaddleSignature(rawBody: string, header: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300) {
  const parts = header.split(";").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "ts")?.[1];
  const signatures = parts.filter(([key]) => key === "h1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}:${rawBody}`, "utf8").digest("hex");
  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  });
}

type PaddleEvent = {
  event_id: string; event_type: string; occurred_at: string;
  data: Record<string, unknown> & { custom_data?: Record<string, unknown> | null };
};

const stringOrNull = (value: unknown) => typeof value === "string" ? value : null;

export async function processPaddleWebhook(repository: RadarRepository, rawBody: string, signature: string, now = new Date()) {
  const config = getPaddleConfiguration();
  if (!verifyPaddleSignature(rawBody, signature, config.webhookSecret, Math.floor(now.getTime() / 1000))) throw new BillingError("Invalid webhook signature.", "FORBIDDEN");
  const event = z.object({ event_id: z.string().min(5), event_type: z.string().min(1), occurred_at: z.string().datetime({ offset: true }), data: z.record(z.string(), z.unknown()) }).parse(JSON.parse(rawBody)) as PaddleEvent;
  const duplicate = await repository.getBillingWebhookEvent(event.event_id);
  if (duplicate?.status === "PROCESSED" || duplicate?.status === "IGNORED") return { duplicate: true };
  const customerInternalId = stringOrNull(event.data.custom_data?.billing_customer_id);
  const customer = customerInternalId ? await repository.getBillingCustomer(customerInternalId) : null;
  const paddleCustomerId = stringOrNull(event.data.customer_id);
  const subscriptionId = event.event_type.startsWith("subscription.") ? stringOrNull(event.data.id) : stringOrNull(event.data.subscription_id);
  const existingSubscription = subscriptionId ? await repository.getSubscriptionByPaddleId(subscriptionId) : null;
  const ownerId = customer?.ownerId ?? existingSubscription?.ownerId ?? null;
  await repository.saveBillingWebhookEvent(BillingWebhookEventSchema.parse({
    id: event.event_id, eventType: event.event_type, ownerId, status: "RECEIVED",
    occurredAt: event.occurred_at, receivedAt: now.toISOString(), processedAt: null, failureCategory: null, schemaVersion: 1,
  }));
  const supported = event.event_type.startsWith("subscription.") || ["transaction.completed", "transaction.payment_failed", "transaction.past_due"].includes(event.event_type);
  if (!supported || !ownerId) {
    await repository.saveBillingWebhookEvent(BillingWebhookEventSchema.parse({ id: event.event_id, eventType: event.event_type, ownerId, status: "IGNORED", occurredAt: event.occurred_at, receivedAt: now.toISOString(), processedAt: now.toISOString(), failureCategory: ownerId ? "UNSUPPORTED_EVENT" : "UNRESOLVED_CUSTOMER", schemaVersion: 1 }));
    return { duplicate: false };
  }
  if (customer && paddleCustomerId && !customer.paddleCustomerId) {
    await repository.saveBillingCustomer(BillingCustomerSchema.parse({ ...customer, paddleCustomerId, updatedAt: now.toISOString() }));
  }
  if (event.event_type === "transaction.completed" && existingSubscription) {
    const transactionId = stringOrNull(event.data.id) ?? existingSubscription.paddleTransactionId;
    if (transactionId !== existingSubscription.paddleTransactionId) {
      await repository.saveSubscription(SubscriptionSchema.parse({
        ...existingSubscription,
        paddleTransactionId: transactionId,
        updatedAt: now.toISOString(),
      }));
    }
  }
  if (subscriptionId && event.event_type !== "transaction.completed") {
    const providerStatus = stringOrNull(event.data.status) ?? (event.event_type === "transaction.payment_failed" || event.event_type === "transaction.past_due" ? "past_due" : existingSubscription?.status.toLowerCase() ?? "active");
    const status = mapPaddleStatus(providerStatus);
    if (!existingSubscription || event.occurred_at >= existingSubscription.providerUpdatedAt) {
      const subscription = SubscriptionSchema.parse({
        id: existingSubscription?.id ?? crypto.randomUUID(), ownerId,
        billingCustomerId: customer?.id ?? existingSubscription?.billingCustomerId,
        paddleSubscriptionId: subscriptionId,
        paddleTransactionId: stringOrNull(event.data.transaction_id) ?? existingSubscription?.paddleTransactionId ?? null,
        planCode: "PRO", status,
        currentPeriodStart: stringOrNull((event.data.current_billing_period as Record<string, unknown> | null)?.starts_at) ?? existingSubscription?.currentPeriodStart ?? null,
        currentPeriodEnd: stringOrNull((event.data.current_billing_period as Record<string, unknown> | null)?.ends_at) ?? existingSubscription?.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: (event.data.scheduled_change as Record<string, unknown> | null)?.action === "cancel",
        providerUpdatedAt: event.occurred_at, createdAt: existingSubscription?.createdAt ?? now.toISOString(), updatedAt: now.toISOString(), schemaVersion: 1,
      });
      await repository.saveSubscription(subscription);
      const grantsPro = status === "ACTIVE" || status === "TRIALING";
      await repository.saveEntitlement(grantsPro ? EntitlementSchema.parse({
        ownerId, effectivePlan: "PRO", businessProfileLimit: PLAN_LIMITS.PRO.businessProfiles,
        monthlyDecisionBriefLimit: PLAN_LIMITS.PRO.monthlyDecisionBriefs, source: "PADDLE_VERIFIED",
        effectiveAt: event.occurred_at, expiresAt: subscription.currentPeriodEnd, diagnosticState: "OK", schemaVersion: 1,
      }) : defaultEntitlement(ownerId, event.occurred_at));
      if (grantsPro) await recordCommercialEvent(repository, ownerId, "SUBSCRIPTION_ACTIVATED", "PRO", event.occurred_at);
      if (status === "CANCELED" || status === "EXPIRED") await recordCommercialEvent(repository, ownerId, "SUBSCRIPTION_CANCELED", "PRO", event.occurred_at);
    }
  }
  if (event.event_type === "transaction.completed") await recordCommercialEvent(repository, ownerId, "CHECKOUT_COMPLETED", "PRO", event.occurred_at);
  await repository.saveBillingWebhookEvent(BillingWebhookEventSchema.parse({ id: event.event_id, eventType: event.event_type, ownerId, status: "PROCESSED", occurredAt: event.occurred_at, receivedAt: now.toISOString(), processedAt: now.toISOString(), failureCategory: null, schemaVersion: 1 }));
  return { duplicate: false };
}

export async function createPortalUrl(repository: RadarRepository, ownerId: string) {
  const [customer, subscription] = await Promise.all([repository.findBillingCustomerByOwner(ownerId), repository.findSubscriptionByOwner(ownerId)]);
  if (!customer?.paddleCustomerId || !subscription) throw new BillingError("No manageable subscription was found.", "INVALID_INPUT");
  const config = getPaddleConfiguration();
  const base = config.environment === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  const response = await fetch(`${base}/customers/${encodeURIComponent(customer.paddleCustomerId)}/portal-sessions`, {
    method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ subscription_ids: [subscription.paddleSubscriptionId] }),
  });
  if (!response.ok) throw new BillingError("Unable to open subscription management.", "PROVIDER_ERROR");
  const payload = await response.json() as { data?: { urls?: { general?: { overview?: string } } } };
  const url = payload.data?.urls?.general?.overview;
  if (!url?.startsWith("https://")) throw new BillingError("Unable to open subscription management.", "PROVIDER_ERROR");
  return url;
}
