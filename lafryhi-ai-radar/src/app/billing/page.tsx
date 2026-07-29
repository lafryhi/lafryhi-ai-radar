import Link from "next/link";
import { getAnonymousSessionId } from "@/auth/anonymous-session";
import { openCustomerPortal } from "@/app/billing-actions";
import { getRepository } from "@/persistence";
import { billingSnapshot, defaultEntitlement, utcPeriodKey } from "@/services/billing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing | LAFRYHI AI Radar" };

export default async function BillingPage() {
  const ownerId = await getAnonymousSessionId();
  const snapshot = ownerId ? await billingSnapshot(await getRepository(), ownerId) : {
    plan: "FREE" as const,
    entitlement: defaultEntitlement("00000000-0000-4000-8000-000000000000"),
    subscription: null,
    businessProfileUsage: 0,
    decisionBriefUsage: 0,
    periodKey: utcPeriodKey(),
  };
  return <section className="public-shell narrow-shell"><p className="eyebrow">Owner-scoped billing</p><h1>Billing</h1>
    <div className="panel billing-summary">
      <dl className="context-grid"><div><dt>Current plan</dt><dd>{snapshot.plan}</dd></div><div><dt>Subscription status</dt><dd>{snapshot.subscription?.status ?? "FREE"}</dd></div><div><dt>Billing period ends</dt><dd>{snapshot.subscription?.currentPeriodEnd ? new Date(snapshot.subscription.currentPeriodEnd).toLocaleDateString() : "—"}</dd></div><div><dt>Business Profiles</dt><dd>{snapshot.businessProfileUsage}/{snapshot.entitlement.businessProfileLimit}</dd></div><div><dt>Decision Briefs ({snapshot.periodKey})</dt><dd>{snapshot.decisionBriefUsage}/{snapshot.entitlement.monthlyDecisionBriefLimit}</dd></div><div><dt>Cancellation</dt><dd>{snapshot.subscription?.cancelAtPeriodEnd ? "Cancels at period end" : "Not scheduled"}</dd></div></dl>
      {snapshot.plan === "PRO" ? <form action={openCustomerPortal}><button className="button-link">Manage Subscription with Paddle</button></form> : <Link className="button-link" href="/pricing">Upgrade to Pro</Link>}
    </div>
    <p className="privacy-note">This workspace is tied to an anonymous browser cookie. Clearing cookies or changing browsers may lose access until full authentication is introduced.</p>
  </section>;
}
