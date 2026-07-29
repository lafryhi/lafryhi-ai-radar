import Image from "next/image";
import Link from "next/link";

const ArrowIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const SignalIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18v2M8 14v6M12 10v10M16 6v14M20 3v17" /></svg>;
const ContextIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>;
const BriefIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4" /></svg>;
const CheckIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;

export default function Home() {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Decision Intelligence for Small Businesses</p>
        <h1>Transform trusted AI signals into confident business decisions.</h1>
        <p className="lede">LAFRYHI AI Radar continuously monitors trusted AI developments, analyzes their business impact with Gemini, and produces personalized Decision Briefs so small businesses know exactly what to do next.</p>
        <div className="hero-actions">
          <Link className="button-link button-primary" href="/get-started">Start Free <ArrowIcon /></Link>
          <a className="button-link secondary" href="#example-brief">See Example Decision Brief</a>
        </div>
        <p className="hero-reassurance"><CheckIcon /> No credit card required</p>
      </div>
      <div className="hero-visual" aria-label="From trusted signal to confident decision">
        <div className="radar-orbit orbit-one" />
        <div className="radar-orbit orbit-two" />
        <div className="radar-core"><Image src="/gemini-spark.svg" alt="" width={44} height={44} /></div>
        <div className="signal-chip signal-chip-one"><span>Signal verified</span><strong>Trusted evidence</strong></div>
        <div className="signal-chip signal-chip-two"><span>Business fit</span><strong>High relevance</strong></div>
        <div className="signal-chip signal-chip-three"><span>Next action</span><strong>Ready to test</strong></div>
      </div>
    </section>

    <section id="example-brief" className="landing-section example-brief-section">
      <div className="section-heading">
        <div><p className="eyebrow">See what you receive</p><h2>A decision, not another news alert.</h2></div>
        <p className="section-copy">A realistic preview of how one trusted AI development becomes a practical next step for your business.</p>
      </div>
      <article className="demo-brief">
        <div className="demo-brief-top">
          <div><span className="demo-label">Signal</span><h3>OpenAI introduces advanced voice capabilities for customer service workflows</h3></div>
          <span className="demo-badge">Example brief</span>
        </div>
        <div className="demo-brief-grid">
          <div className="demo-main">
            <div className="demo-field"><span className="demo-label">Business Impact</span><strong className="impact-high">High</strong><p>Small service businesses can now test faster, more natural first-line responses without replacing their existing support process.</p></div>
            <div className="demo-field recommendation"><span className="demo-label">Recommendation</span><p>Run a 2-week experiment on one repeat customer question. Compare response time, resolution rate, and customer satisfaction against your current workflow.</p></div>
          </div>
          <dl className="demo-metrics">
            <div><dt>Estimated effort</dt><dd>Low</dd></div>
            <div><dt>Potential benefit</dt><dd>High</dd></div>
            <div><dt>Confidence</dt><dd>92%</dd></div>
          </dl>
        </div>
        <div className="demo-footer">
          <p><CheckIcon /> Evidence linked <span>•</span> Human verified <span>•</span> Personalized to your profile</p>
          <Link className="button-link secondary" href="/get-started">View Full Decision Brief <ArrowIcon /></Link>
        </div>
      </article>
      <p className="demo-disclaimer">Demonstration only. Your Decision Briefs are personalized to your business profile and the available evidence.</p>
    </section>

    <section id="how-it-works" className="landing-section">
      <div className="centered-heading"><p className="eyebrow">How it works</p><h2>From AI change to your next move.</h2><p className="section-copy">Three simple steps turn a fast-moving field into focused business guidance.</p></div>
      <div className="process-grid three-step">
        <article className="process-card"><div className="step-icon"><SignalIcon /></div><span>Step 1</span><h3>Monitor trusted AI signals.</h3><p>We track credible developments so you do not have to sift through the noise.</p></article>
        <article className="process-card"><div className="step-icon"><ContextIcon /></div><span>Step 2</span><h3>Gemini analyzes your business context.</h3><p>Each signal is evaluated against your needs, constraints, and opportunities.</p></article>
        <article className="process-card"><div className="step-icon"><BriefIcon /></div><span>Step 3</span><h3>Receive a personalized Decision Brief.</h3><p>Get the impact, evidence, confidence, and a practical recommended action.</p></article>
      </div>
    </section>

    <section id="pricing" className="landing-section home-pricing">
      <div className="centered-heading"><p className="eyebrow">Simple pricing</p><h2>Start free. Upgrade only when ready.</h2><p className="section-copy">Try the complete decision workflow first, then add capacity as your business needs it.</p></div>
      <div className="pricing-grid">
        <article className="panel price-card"><p className="plan-name">Free</p><h2>$0 <small>/ month</small></h2><p className="plan-description">For exploring decision intelligence.</p><ul className="feature-list"><li><CheckIcon /><span><strong>1</strong> Business Profile</span></li><li><CheckIcon /><span><strong>3</strong> Decision Briefs / month</span></li><li><CheckIcon /><span>Core feedback and impact features</span></li></ul><Link className="button-link secondary" href="/get-started">Start Free</Link></article>
        <article className="panel price-card featured"><span className="popular-badge">Most popular</span><p className="plan-name">Pro</p><h2>$9 <small>/ month</small></h2><p className="plan-description">For businesses ready to act more often.</p><ul className="feature-list"><li><CheckIcon /><span><strong>3</strong> Business Profiles</span></li><li><CheckIcon /><span><strong>50</strong> Decision Briefs / month</span></li><li><CheckIcon /><span>Priority access to new signals</span></li></ul><Link className="button-link button-primary" href="/pricing">Explore Pro <ArrowIcon /></Link></article>
      </div>
    </section>

    <section className="trust-section" aria-labelledby="trust-title">
      <p id="trust-title" className="sr-only">Why you can trust LAFRYHI AI Radar</p>
      <div><Image src="/gemini-spark.svg" alt="" width={25} height={25} /><span>Powered by Gemini</span></div>
      <div><CheckIcon /><span>Evidence-linked recommendations</span></div>
      <div><CheckIcon /><span>Human-verified workflow</span></div>
      <div><CheckIcon /><span>Secure cloud infrastructure</span></div>
      <div><CheckIcon /><span>Small Business focused</span></div>
    </section>

    <section id="faq" className="landing-section faq-section">
      <div><p className="eyebrow">FAQ</p><h2>Questions, answered.</h2><p className="section-copy">Everything you need to start making clearer decisions.</p></div>
      <div className="faq-list">
        <details><summary>What is a Decision Brief?</summary><p>A concise, personalized analysis of a trusted AI signal, including its business impact, supporting evidence, confidence, and a practical recommended action.</p></details>
        <details><summary>Do I need AI experience?</summary><p>No. LAFRYHI AI Radar translates technical developments into plain business language and focused next steps.</p></details>
        <details><summary>Is my data private?</summary><p>Your business context is used to personalize your Decision Briefs. We use secure cloud infrastructure and explain our data practices in our Privacy Policy.</p></details>
        <details><summary>Can I cancel anytime?</summary><p>Yes. Pro is a monthly subscription with no annual commitment. You can manage or cancel it through the secure billing portal.</p></details>
      </div>
    </section>

    <section className="cta-section">
      <p className="eyebrow">Your next decision starts here</p>
      <h2>Know what matters. Decide what to do next.</h2>
      <p>Create your free Business Profile and turn trusted AI change into a practical advantage.</p>
      <Link className="button-link button-primary" href="/get-started">Start Free <ArrowIcon /></Link>
    </section>
  </>;
}
