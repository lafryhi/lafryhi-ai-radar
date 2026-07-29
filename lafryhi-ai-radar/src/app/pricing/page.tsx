import Link from "next/link";
import { getAnonymousSessionId } from "@/auth/anonymous-session";
import { PaddleCheckout } from "@/components/public/paddle-checkout";
import { getRepository } from "@/persistence";
import { recordCommercialEvent } from "@/services/billing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing | LAFRYHI AI Radar" };

export default async function PricingPage() {
  const ownerId = await getAnonymousSessionId();
  if (ownerId) await recordCommercialEvent(await getRepository(), ownerId, "PRICING_VIEWED", null);
  return <section className="public-shell">
    <p className="eyebrow">Simple recurring plans</p><h1>Choose the decision capacity your business needs.</h1>
    <p className="section-copy">Start free. Upgrade to Pro for $9 per month when you need more Business Profiles and Decision Briefs. No annual plan and no unlimited-usage claim.</p>
    <div className="pricing-grid">
      <article className="panel price-card"><p className="eyebrow">Free</p><h2>$0</h2><ul><li>1 active Business Profile</li><li>3 Decision Briefs per calendar month</li><li>Feedback and action tracking</li><li>Outcome recording and My Impact</li><li>Public Trusted Signals</li></ul><Link className="button-link secondary" href="/get-started">Start Free</Link></article>
      <article className="panel price-card featured"><p className="eyebrow">Pro</p><h2>$9 <small>/ month</small></h2><ul><li>Up to 3 Business Profiles</li><li>50 Decision Briefs per calendar month</li><li>Full feedback, action, outcome, and impact workflow</li><li>Priority access to newly published Trusted Signals</li><li>Paddle-hosted subscription management</li></ul><PaddleCheckout /></article>
    </div>
    <p className="privacy-note">Recurring payment processing is handled securely by Paddle, the payment provider and Merchant of Record where applicable. Pro access begins only after a verified Paddle webhook.</p>
    <nav className="legal-links" aria-label="Commercial policies"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refund-policy">Refund policy</Link></nav>
  </section>;
}
