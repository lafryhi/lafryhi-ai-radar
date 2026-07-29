import { z } from "zod";
import type { RadarRepository } from "@/persistence/repository";
import { PLAN_LIMITS, utcPeriodKey } from "./billing";

export const RevenueMetricsSchema = z.object({
  freeOwners: z.number().int().nonnegative(), proOwners: z.number().int().nonnegative(),
  activeSubscriptions: z.number().int().nonnegative(), pastDueSubscriptions: z.number().int().nonnegative(),
  canceledSubscriptions: z.number().int().nonnegative(), verifiedTransactions: z.number().int().nonnegative(),
  estimatedMrrCents: z.number().int().nonnegative(), newProByMonth: z.array(z.object({ month: z.string(), count: z.number().int().nonnegative() })),
  decisionOwnersToProRate: z.number().nullable(), currentMonthPaidDecisionUsage: z.number().int().nonnegative(),
  funnel: z.object({ pricingViews: z.number(), checkoutStarts: z.number(), verifiedPurchases: z.number(), activePro: z.number() }),
}).strict();

export async function getRevenueMetrics(repository: RadarRepository, now = new Date()) {
  const [customers, subscriptions, events, webhookEvents, briefs, usage] = await Promise.all([
    repository.listAllBillingCustomers(), repository.listAllSubscriptions(), repository.listAllCommercialEvents(),
    repository.listAllBillingWebhookEvents(), repository.listAllDecisionBriefs(), repository.listAllUsageCounters(),
  ]);
  const latest = new Map<string, (typeof subscriptions)[number]>();
  subscriptions.forEach((sub) => { const old = latest.get(sub.ownerId); if (!old || sub.providerUpdatedAt > old.providerUpdatedAt) latest.set(sub.ownerId, sub); });
  const activeOwners = new Set([...latest.values()].filter((x) => x.status === "ACTIVE" || x.status === "TRIALING").map((x) => x.ownerId));
  const allOwners = new Set([...customers.map((x) => x.ownerId), ...briefs.map((x) => x.ownerId)]);
  const decisionOwners = new Set(briefs.map((x) => x.ownerId));
  const byMonth = new Map<string, number>();
  [...latest.values()].filter((x) => activeOwners.has(x.ownerId)).forEach((x) => byMonth.set(x.createdAt.slice(0,7), (byMonth.get(x.createdAt.slice(0,7)) ?? 0) + 1));
  return RevenueMetricsSchema.parse({
    freeOwners: [...allOwners].filter((id) => !activeOwners.has(id)).length, proOwners: activeOwners.size,
    activeSubscriptions: activeOwners.size,
    pastDueSubscriptions: [...latest.values()].filter((x) => x.status === "PAST_DUE").length,
    canceledSubscriptions: [...latest.values()].filter((x) => x.status === "CANCELED" || x.status === "EXPIRED").length,
    verifiedTransactions: webhookEvents.filter((x) => x.eventType === "transaction.completed" && x.status === "PROCESSED").length,
    estimatedMrrCents: activeOwners.size * PLAN_LIMITS.PRO.monthlyPriceCents,
    newProByMonth: [...byMonth.entries()].sort().map(([month,count])=>({month,count})),
    decisionOwnersToProRate: decisionOwners.size ? [...decisionOwners].filter((id)=>activeOwners.has(id)).length / decisionOwners.size : null,
    currentMonthPaidDecisionUsage: usage.filter((x)=>x.periodKey===utcPeriodKey(now) && activeOwners.has(x.ownerId)).reduce((sum,x)=>sum+x.decisionBriefCount,0),
    funnel: {
      pricingViews: events.filter((x)=>x.type==="PRICING_VIEWED").length,
      checkoutStarts: events.filter((x)=>x.type==="CHECKOUT_STARTED").length,
      verifiedPurchases: events.filter((x)=>x.type==="CHECKOUT_COMPLETED").length,
      activePro: activeOwners.size,
    },
  });
}
