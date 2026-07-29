import Link from "next/link";

export const metadata = { title: "Get Started | LAFRYHI AI Radar" };

export default function GetStartedPage() {
  return <section className="public-shell">
    <p className="eyebrow">Personalized Decision Intelligence</p>
    <h1>Turn a trusted AI signal into a decision for your business.</h1>
    <p className="lede">Create a private Business Profile for this browser session, choose a human-verified signal, and let Gemini evaluate the options against your goals, capabilities, budget, and risk tolerance.</p>
    <div className="process-grid">
      <article className="process-card"><span>01</span><h3>Define your context</h3><p>Tell us enough about your business to avoid generic recommendations.</p></article>
      <article className="process-card"><span>02</span><h3>Select trusted evidence</h3><p>Choose only from signals already verified and published by the platform.</p></article>
      <article className="process-card"><span>03</span><h3>Read your Decision Brief</h3><p>Compare options, evidence, impact, effort, risks, and measurable next steps.</p></article>
    </div>
    <p className="privacy-note">This MVP uses an anonymous, HTTP-only browser cookie. It is not a user account and does not collect login credentials.</p>
    <Link className="button-link" href="/business-profile">Create Your Business Profile</Link>
  </section>;
}
