import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRepository } from "@/persistence/memory";
import { BillingCustomerSchema, EntitlementSchema, SubscriptionSchema } from "@/domain/billing";
import { BusinessProfileSchema } from "@/domain/public-mvp";
import {
  BillingError, PLAN_LIMITS, assertBusinessProfileCapacity, assertDecisionCapacity,
  billingSnapshot, countSuccessfulDecision, defaultEntitlement, initiateCheckout,
  mapPaddleStatus, processPaddleWebhook, resolveEntitlement, utcPeriodKey, verifyPaddleSignature,
} from "./billing";
import { getRevenueMetrics } from "./revenue-analytics";

const owner = "00000000-0000-4000-8000-000000000001";
const customerId = "00000000-0000-4000-8000-000000000002";
const fixed = "2026-07-29T10:00:00.000Z";
const envBackup = { ...process.env };
afterEach(() => { process.env = { ...envBackup }; });

function configure() {
  Object.assign(process.env, {
    PADDLE_ENVIRONMENT: "sandbox", PADDLE_CLIENT_TOKEN: "test_client_token",
    PADDLE_API_KEY: "pdl_sdbx_api_key", PADDLE_WEBHOOK_SECRET: "pdl_ntfset_secret",
    PADDLE_PRO_PRICE_ID: "pri_01sandboxprice", PADDLE_DEFAULT_CHECKOUT_URL: "https://example.test",
  });
}

async function seedCustomer(repo: MemoryRepository) {
  await repo.saveBillingCustomer(BillingCustomerSchema.parse({
    id: customerId, ownerId: owner, email: "owner@example.test", displayName: null,
    paddleCustomerId: null, checkoutCorrelationId: "00000000-0000-4000-8000-000000000003",
    createdAt: fixed, updatedAt: fixed, schemaVersion: 1,
  }));
}

function signed(body: string, timestamp = 1785319200) {
  const digest = createHmac("sha256", "pdl_ntfset_secret").update(`${timestamp}:${body}`).digest("hex");
  return `ts=${timestamp};h1=${digest}`;
}

function event(eventId: string, type: string, status: string, occurredAt = fixed) {
  return JSON.stringify({
    event_id: eventId, event_type: type, occurred_at: occurredAt,
    data: {
      id: "sub_01sandboxsubscription", customer_id: "ctm_01sandboxcustomer",
      transaction_id: "txn_01sandboxtransaction", status,
      custom_data: { billing_customer_id: customerId, plan_code: "PRO" },
      current_billing_period: { starts_at: fixed, ends_at: "2026-08-29T10:00:00.000Z" },
    },
  });
}

describe("paid plans and entitlements", () => {
  it("defaults new and inconsistent owners to Free", async () => {
    const repo = new MemoryRepository();
    expect((await resolveEntitlement(repo, owner, fixed)).effectivePlan).toBe("FREE");
    await repo.saveEntitlement(EntitlementSchema.parse({ ...defaultEntitlement(owner, fixed), effectivePlan: "PRO", source: "PADDLE_VERIFIED", businessProfileLimit: 3, monthlyDecisionBriefLimit: 50 }));
    expect((await resolveEntitlement(repo, owner, fixed)).effectivePlan).toBe("FREE");
  });

  it("grants Pro only for an active verified subscription and fails closed for past due", async () => {
    const repo = new MemoryRepository(); await seedCustomer(repo);
    const sub = SubscriptionSchema.parse({ id: crypto.randomUUID(), ownerId: owner, billingCustomerId: customerId, paddleSubscriptionId: "sub_active", paddleTransactionId: null, planCode: "PRO", status: "ACTIVE", currentPeriodStart: fixed, currentPeriodEnd: "2026-08-29T10:00:00.000Z", cancelAtPeriodEnd: false, providerUpdatedAt: fixed, createdAt: fixed, updatedAt: fixed, schemaVersion: 1 });
    await repo.saveSubscription(sub);
    await repo.saveEntitlement(EntitlementSchema.parse({ ownerId: owner, effectivePlan: "PRO", businessProfileLimit: 3, monthlyDecisionBriefLimit: 50, source: "PADDLE_VERIFIED", effectiveAt: fixed, expiresAt: sub.currentPeriodEnd, diagnosticState: "OK", schemaVersion: 1 }));
    expect((await resolveEntitlement(repo, owner, fixed)).effectivePlan).toBe("PRO");
    await repo.saveSubscription({ ...sub, status: "PAST_DUE", providerUpdatedAt: "2026-07-30T10:00:00.000Z" });
    expect((await resolveEntitlement(repo, owner, "2026-07-30T10:00:01.000Z")).effectivePlan).toBe("FREE");
    expect(mapPaddleStatus("canceled")).toBe("CANCELED");
  });

  it("enforces Free profile and monthly Decision Brief limits with UTC rollover", async () => {
    const repo = new MemoryRepository();
    await repo.saveBusinessProfile(BusinessProfileSchema.parse({ id: crypto.randomUUID(), ownerId: owner, businessName: "One", industry: "Retail", companySize: "MICRO", aiMaturity: "NONE", businessGoals: ["Reduce costs"], currentTools: [], budgetRange: "NO_BUDGET", riskTolerance: "LOW", createdAt: fixed, updatedAt: fixed, schemaVersion: 1 }));
    await expect(assertBusinessProfileCapacity(repo, owner)).rejects.toMatchObject({ code: "PLAN_LIMIT_REACHED" });
    for (let index = 0; index < PLAN_LIMITS.FREE.monthlyDecisionBriefs; index++) await countSuccessfulDecision(repo, owner, new Date(fixed));
    await expect(assertDecisionCapacity(repo, owner, new Date(fixed))).rejects.toMatchObject({ code: "PLAN_LIMIT_REACHED" });
    expect((await assertDecisionCapacity(repo, owner, new Date("2026-08-01T00:00:00.000Z"))).used).toBe(0);
    expect(utcPeriodKey(new Date("2026-08-31T23:59:59.000Z"))).toBe("2026-08");
  });
});

describe("Paddle checkout and verified webhooks", () => {
  it("maps PRO to the configured price, validates email, and exposes no server secret", async () => {
    configure(); const repo = new MemoryRepository();
    const checkout = await initiateCheckout(repo, owner, { plan: "PRO", email: "buyer@example.test" }, fixed);
    expect(checkout.priceId).toBe("pri_01sandboxprice");
    expect(JSON.stringify(checkout)).not.toContain("pdl_sdbx_api_key");
    expect(JSON.stringify(checkout)).not.toContain("pdl_ntfset_secret");
    await expect(initiateCheckout(repo, owner, { plan: "PRO", email: "bad", priceId: "pri_attacker" }, fixed)).rejects.toBeInstanceOf(BillingError);
  });

  it("fails safely when Paddle is missing and verifies signatures over the raw body", async () => {
    const repo = new MemoryRepository();
    await expect(initiateCheckout(repo, owner, { plan: "PRO", email: "buyer@example.test" }, fixed)).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    const body = "{}"; const header = signed(body);
    expect(verifyPaddleSignature(body, header, "pdl_ntfset_secret", 1785319200)).toBe(true);
    expect(verifyPaddleSignature(`${body} `, header, "pdl_ntfset_secret", 1785319200)).toBe(false);
  });

  it("activates Pro idempotently, rejects invalid signatures, and ignores older cancellation", async () => {
    configure(); const repo = new MemoryRepository(); await seedCustomer(repo);
    const body = event("evt_01active", "subscription.activated", "active");
    await processPaddleWebhook(repo, body, signed(body), new Date(fixed));
    expect((await billingSnapshot(repo, owner, new Date(fixed))).plan).toBe("PRO");
    expect((await processPaddleWebhook(repo, body, signed(body), new Date(fixed))).duplicate).toBe(true);
    await expect(processPaddleWebhook(repo, body, "ts=1;h1=bad", new Date(fixed))).rejects.toMatchObject({ code: "FORBIDDEN" });
    const older = event("evt_01old", "subscription.canceled", "canceled", "2026-07-28T10:00:00.000Z");
    await processPaddleWebhook(repo, older, signed(older), new Date(fixed));
    expect((await resolveEntitlement(repo, owner, fixed)).effectivePlan).toBe("PRO");
  });

  it("maps cancellation and payment failure to Free", async () => {
    configure(); const repo = new MemoryRepository(); await seedCustomer(repo);
    const active = event("evt_01a", "subscription.activated", "active");
    await processPaddleWebhook(repo, active, signed(active), new Date(fixed));
    const failed = event("evt_01b", "subscription.updated", "past_due", "2026-07-30T10:00:00.000Z");
    await processPaddleWebhook(repo, failed, signed(failed, 1785405600), new Date("2026-07-30T10:00:00.000Z"));
    expect((await resolveEntitlement(repo, owner, "2026-07-30T10:00:01.000Z")).effectivePlan).toBe("FREE");
  });
});

describe("revenue analytics privacy", () => {
  it("calculates verified MRR and emits aggregates without private identifiers", async () => {
    configure(); const repo = new MemoryRepository(); await seedCustomer(repo);
    const active = event("evt_01rev", "subscription.activated", "active");
    await processPaddleWebhook(repo, active, signed(active), new Date(fixed));
    const metrics = await getRevenueMetrics(repo, new Date(fixed));
    expect(metrics.estimatedMrrCents).toBe(900);
    expect(JSON.stringify(metrics)).not.toContain(owner);
    expect(JSON.stringify(metrics)).not.toContain("owner@example.test");
    expect(JSON.stringify(metrics)).not.toContain("ctm_");
  });
});
