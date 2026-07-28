import Image from "next/image";
import { getRepository } from "@/persistence";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await (await getRepository()).listPublishedItems();
  const featured = items[0];

  return <>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Decision Intelligence for Small Businesses</p>
        <h1>Transform trusted AI signals into confident business decisions.</h1>
        <p className="lede">LAFRYHI AI Radar uses Gemini to analyze trusted AI developments and help small businesses identify opportunities, reduce risks, and decide what to do next.</p>
        <div className="hero-actions">
          <a className="button-link" href="#decision-center">Explore the Decision Center</a>
          <a className="button-link secondary" href="#how-it-works">See how it works</a>
        </div>
        <div className="gemini-attribution" aria-label="Powered by Gemini">
          <Image src="/gemini-spark.svg" alt="" width={28} height={28} />
          <span>Powered by Gemini</span>
        </div>
      </div>
      <div className="hero-brief" aria-label="Decision intelligence preview">
        <p className="section-label">Decision Brief</p>
        <span className="decision-state">Human verified</span>
        <h2>Know what changed, why it affects your business, and what to do next.</h2>
        <div className="brief-signal"><span>Trusted signal</span><strong>Verified source evidence</strong></div>
        <div className="brief-signal"><span>Gemini intelligence</span><strong>Opportunity, risk, and impact</strong></div>
        <div className="brief-signal"><span>Recommended action</span><strong>A clear, practical next step</strong></div>
      </div>
    </section>

    <section id="how-it-works" className="landing-section">
      <div className="section-heading"><div><p className="eyebrow">How it works</p><h2>From signal to decision</h2></div><p className="section-copy">A controlled intelligence pipeline turns trusted developments into evidence-backed guidance.</p></div>
      <div className="process-grid">
        <article className="process-card"><span>01</span><h3>Trusted Signals</h3><p>Official and verified sources are monitored through a governed source registry.</p></article>
        <article className="process-card"><span>02</span><h3>Gemini Intelligence</h3><p>Gemini identifies business significance, opportunities, risks, confidence, and practical actions.</p></article>
        <article className="process-card"><span>03</span><h3>Human Verification</h3><p>A human verifies the evidence and remains responsible for every published Decision Brief.</p></article>
        <article className="process-card"><span>04</span><h3>Confident Decisions</h3><p>Small businesses receive a concise view of what matters and what to do next.</p></article>
      </div>
    </section>

    <section id="trusted-signals" className="landing-section split-section">
      <div><p className="eyebrow">Trusted Signals</p><h2>Start with evidence, not noise.</h2></div>
      <div><p className="section-copy">AI developments are admitted through trusted-source governance, bounded discovery, provenance checks, and duplicate controls before Gemini Analysis begins.</p><p className="trust-note">Every Decision Brief preserves its original source, publication date, processing run, Gemini Analysis, and Human Verification record.</p></div>
    </section>

    <section id="decision-center" className="landing-section">
      <div className="section-heading"><div><p className="eyebrow">Gemini Intelligence</p><h2>Decision Center</h2></div><p className="section-copy">Verified intelligence focused on Business Impact and action—not an endless stream of updates.</p></div>
      <div className="stack decision-list">
        {items.length === 0 && <div className="panel empty-state"><p className="section-label">Verification in progress</p><h3>No verified Decision Briefs yet</h3><p>The Decision Center remains evidence-first. A brief appears only after a trusted signal completes Gemini Analysis and Human Verification.</p></div>}
        {items.map((item) => <article className="panel decision-brief" key={item.id}>
          <div className="meta"><span>{item.category.replaceAll("_", " ")}</span><span>Verified {new Date(item.sourcePublishedAt).toLocaleDateString()}</span></div>
          <h2>{item.publicTitle}</h2>
          <p className="section-label">Gemini Insight</p><p>{item.publicSummary}</p>
          <h3>Business Impact</h3><p>{item.whyItMatters}</p>
          <h3>Recommended Action</h3><p>{item.recommendedAction}</p>
          <div className="scores"><span>Decision Score {item.relevanceScore}/100</span><span>Confidence {item.confidenceScore}/100</span></div>
          <p className="trace">Gemini Analysis with Human Verification · Trusted source: <a href={item.originalSourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceName}</a></p>
          <details><summary>Evidence and traceability</summary><code>source {item.sourceRecordId}<br />run {item.processingRunId}<br />Gemini analysis {item.analysisResultId}<br />Human verification {item.reviewDecisionId}</code></details>
        </article>)}
      </div>
    </section>

    <section id="decision-briefs" className="landing-section example-section">
      <div><p className="eyebrow">Decision Brief Example</p><h2>{featured?.publicTitle ?? "A clear answer to: What should my business do next?"}</h2></div>
      <div className="example-grid">
        <div><span>Gemini Insight</span><p>{featured?.publicSummary ?? "Gemini translates a trusted signal into a concise explanation of the change and its decision relevance."}</p></div>
        <div><span>Business Impact</span><p>{featured?.whyItMatters ?? "Understand the opportunity, risk, timing, and likely effect on a small business."}</p></div>
        <div><span>Recommended Action</span><p>{featured?.recommendedAction ?? "Receive a bounded next step grounded in verified evidence—not a generic news summary."}</p></div>
      </div>
    </section>

    <section id="opportunities" className="landing-section">
      <div className="section-heading"><div><p className="eyebrow">Why businesses use AI Radar</p><h2>Less monitoring. More confident action.</h2></div></div>
      <div className="value-grid">
        <article><h3>Identify opportunities</h3><p>Recognize relevant capabilities, programs, and market changes before they are easy to miss.</p></article>
        <article><h3>Reduce risk</h3><p>See uncertainty, evidence warnings, and potential business consequences before committing resources.</p></article>
        <article><h3>Prioritize attention</h3><p>Focus on high-value signals and safely ignore developments that do not justify action.</p></article>
      </div>
    </section>

    <section id="human-verification" className="landing-section verification-callout">
      <div><p className="eyebrow">Human Verification</p><h2>Gemini advises. People decide.</h2></div>
      <p>Gemini produces structured decision intelligence, but it cannot publish on its own. Every Decision Brief requires deliberate Human Verification and retains complete source provenance.</p>
    </section>

    <section className="cta-section">
      <p className="eyebrow">Make the next signal actionable</p>
      <h2>Turn AI change into business direction.</h2>
      <p>Explore verified signals, Gemini Insights, Business Impact, and Recommended Actions in one Decision Center.</p>
      <a className="button-link" href="#decision-center">Open the Decision Center</a>
    </section>
  </>;
}
