import Link from "next/link";
export default function TermsPage() { return <Policy title="Terms of Service">
  <p>LAFRYHI AI Radar is an independent Decision Intelligence product. It is not a Google or Paddle product.</p>
  <h2>Decision support</h2><p>Gemini assists with evidence-linked analysis. Outputs are not legal, financial, medical, tax, or other regulated professional advice. Customers remain responsible for decisions and outcomes.</p>
  <h2>Plans and usage</h2><p>Free includes one Business Profile and three Decision Briefs per UTC calendar month. Pro is a recurring $9 monthly subscription with up to three profiles and fifty briefs per UTC calendar month. Access may be limited for failed, paused, past-due, canceled, or expired subscriptions.</p>
  <h2>Anonymous workspace</h2><p>Access is tied to a browser cookie. Clearing cookies or changing browsers may make the workspace inaccessible until account authentication is introduced.</p>
  <h2>Billing</h2><p>Paddle processes recurring payments and acts as Merchant of Record where applicable. Subscription changes and cancellation are available through Paddle’s hosted customer portal.</p>
</Policy>; }
function Policy({ title, children }: { title: string; children: React.ReactNode }) { return <section className="public-shell narrow-shell policy"><p className="eyebrow">Commercial policy</p><h1>{title}</h1><p className="privacy-note">Effective July 29, 2026.</p>{children}<p><Link href="/pricing">Return to Pricing</Link></p></section>; }
export { Policy };
