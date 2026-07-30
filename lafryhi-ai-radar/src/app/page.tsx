import Image from "next/image";

const repositoryUrl = "https://github.com/lafryhi/lafryhi-ai-radar";
const architectureUrl = `${repositoryUrl}/blob/main/GEMINI_XPRIZE_ARCHITECTURE.md`;
const evaluationUrl = `${repositoryUrl}/blob/main/eval/results/2026-07-30T12-44-43-854Z-gemini-migration.md`;

const ArrowIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const CheckIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;

const differentiators = [
  ["01", "Evidence Verification", "Every factual claim is tied to exact source evidence before it can influence a decision."],
  ["02", "Editorial Governance", "A deterministic policy constitution constrains model recommendations independently of the model provider."],
  ["03", "Human Review", "AI output never publishes itself. Human judgment remains the final editorial authority."],
  ["04", "Decision Traceability", "Evaluation, signal, decision, policy, review, and publication identifiers form one reconstructable chain."],
  ["05", "Candidate Model Evaluation", "Production and candidate models run against the same contract, evidence, and policy controls."],
  ["06", "Safe Production Migration", "A model changes production only after reliability, safety, editorial, and operational gates pass."],
] as const;

const pipeline = [
  ["01", "Official Sources", "Trusted input"],
  ["02", "Signal Intelligence", "Extract grounded claims"],
  ["03", "Decision Intelligence", "Assess relevance and action"],
  ["04", "Evidence Verification", "Validate quotes and IDs"],
  ["05", "Editorial Policy Engine", "Apply deterministic rules"],
  ["06", "Human Review", "Approve, defer, or reject"],
  ["07", "Publication", "Only reviewed output"],
] as const;

const metrics = [
  ["VALID", "Evaluation Integrity", "Forensically validated report"],
  ["ADMISSIBLE", "Metric Admissibility", "Eligible for governance review"],
  ["100%", "Reliability", "Transport through pipeline completion"],
  ["100%", "Detector Agreement", "One canonical term adjudication"],
  ["100%", "Evidence Compliance", "Exact evidence and evidence IDs"],
  ["0%", "Production Traffic", "Candidate remains evaluation-only"],
] as const;

const safetyControls = [
  ["Human Review", "Normal application review remains mandatory, regardless of model or policy outcome."],
  ["Evidence Validation", "Exact quotations, evidence IDs, schemas, and application rules are checked independently."],
  ["Policy Enforcement", "Versioned rules downgrade, block, or route material findings to additional review."],
  ["Audit Trail", "Privacy-safe identifiers and fingerprints make every decision reconstructable."],
  ["Production Isolation", "Candidate execution cannot publish, persist application data, or receive production traffic."],
  ["Governance-Based Deployment", "Migration readiness depends on measured thresholds—not a newer model name."],
] as const;

const technologies = [
  ["G", "Gemini"],
  ["V", "Vertex AI"],
  ["N", "Next.js"],
  ["TS", "TypeScript"],
  ["CR", "Cloud Run"],
  ["F", "Firestore"],
  ["Z", "Zod"],
  ["Vt", "Vitest"],
] as const;

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="governance-heading">
    <p className="eyebrow">{eyebrow}</p>
    <h2>{title}</h2>
    <p className="section-copy">{copy}</p>
  </div>;
}

export default function Home() {
  return <>
    <section className="hero governance-hero">
      <div className="hero-copy">
        <p className="hero-product">LAFRYHI AI Radar</p>
        <p className="eyebrow">Evidence-Driven AI Governance for Editorial Intelligence</p>
        <h1><span>AI evaluates the news.</span> LAFRYHI AI Radar evaluates the AI.</h1>
        <p className="lede">A production-grade governance platform for testing candidate AI models before migration—through grounded evidence, deterministic editorial policy, complete traceability, and mandatory human review.</p>
        <div className="hero-actions">
          <a className="button-link button-primary" href={architectureUrl} target="_blank" rel="noreferrer">View Architecture <ArrowIcon /></a>
          <a className="button-link secondary" href={evaluationUrl} target="_blank" rel="noreferrer">Evaluation Report</a>
          <a className="button-link text-button" href={repositoryUrl} target="_blank" rel="noreferrer">GitHub Repository <ArrowIcon /></a>
        </div>
        <p className="hero-reassurance"><CheckIcon /> Production remains isolated while governance decides what comes next.</p>
      </div>

      <div className="hero-visual governance-radar" aria-label="Governance controls surrounding an evaluated AI model">
        <div className="radar-orbit orbit-one" />
        <div className="radar-orbit orbit-two" />
        <div className="radar-core"><Image src="/gemini-spark.svg" alt="" width={44} height={44} /></div>
        <div className="signal-chip signal-chip-one"><span>Evidence</span><strong>Exact quotes verified</strong></div>
        <div className="signal-chip signal-chip-two"><span>Policy</span><strong>Deterministic rules</strong></div>
        <div className="signal-chip signal-chip-three"><span>Decision</span><strong>Human review required</strong></div>
        <div className="model-label production-label"><span>Production</span><strong>Gemini 2.5 Flash</strong></div>
        <div className="model-label candidate-label"><span>Evaluation only</span><strong>Gemini 3.1 Flash-Lite</strong></div>
      </div>
    </section>

    <section className="status-banner" aria-label="Release candidate status">
      <div><span>Release</span><strong>RC-1</strong></div>
      <div><span>Production Model</span><strong>Gemini 2.5 Flash</strong></div>
      <div><span>Candidate Model</span><strong>Gemini 3.1 Flash-Lite <em>Evaluation only</em></strong></div>
      <div><span>Shadow Evaluation</span><strong>Second controlled run completed</strong></div>
      <div><span>Governance</span><strong className="status-active">Evaluation active</strong></div>
    </section>

    <section className="landing-section challenge-section">
      <div className="challenge-number" aria-hidden="true">01</div>
      <div>
        <p className="eyebrow">The challenge</p>
        <h2>AI can generate information.<br /><span>Who evaluates the AI?</span></h2>
      </div>
      <div className="challenge-copy">
        <p>Model output can be fluent, structured, and technically valid while still making the wrong editorial decision.</p>
        <p>LAFRYHI AI Radar evaluates the whole path before production deployment: transport, schema, evidence, recommendations, policy behavior, operational isolation, and human-review guarantees.</p>
      </div>
    </section>

    <section className="landing-section" id="difference">
      <SectionHeading eyebrow="Governance by design" title="What makes AI Radar different" copy="The system does not ask whether a candidate model is newer. It asks whether that model can be trusted inside a controlled editorial workflow." />
      <div className="governance-card-grid">
        {differentiators.map(([number, title, copy]) => <article className="governance-card" key={title}>
          <span>{number}</span><h3>{title}</h3><p>{copy}</p>
        </article>)}
      </div>
    </section>

    <section className="landing-section architecture-section" id="architecture">
      <SectionHeading eyebrow="System architecture" title="Governance is part of the pipeline." copy="Evidence and policy are not post-processing decorations. They are explicit gates between model output and publication." />
      <div className="architecture-flow" role="list" aria-label="AI Radar governance pipeline">
        {pipeline.map(([number, title, copy], index) => <div className="architecture-step" role="listitem" key={title}>
          <article><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>
          {index < pipeline.length - 1 && <div className="flow-arrow" aria-hidden="true">↓</div>}
        </div>)}
      </div>
      <div className="architecture-guarantee"><CheckIcon /><span><strong>Publication is not an AI action.</strong> It is a reviewed governance outcome.</span></div>
    </section>

    <section className="landing-section evaluation-section" id="evaluation">
      <div className="section-heading">
        <SectionHeading eyebrow="Verified engineering evidence" title="Evaluation highlights" copy="Results from the second controlled 15-case shadow evaluation, validated against the report contract and offline forensic validator." />
        <a className="text-link report-link" href={evaluationUrl} target="_blank" rel="noreferrer">Read the full report <ArrowIcon /></a>
      </div>
      <div className="evaluation-metrics">
        {metrics.map(([value, label, note]) => <article className="evaluation-card" key={label}>
          <span>{label}</span><strong>{value}</strong><p>{note}</p>
        </article>)}
      </div>
      <p className="evaluation-note"><strong>Transparent by design:</strong> the candidate remains evaluation-only because governance thresholds—not technical compatibility alone—control migration.</p>
    </section>

    <section className="landing-section why-section">
      <div className="why-panel">
        <p className="eyebrow">Why it matters</p>
        <h2>Trust is established before deployment—not after failure.</h2>
        <p>Production migration should never depend on model version alone. AI Radar compares raw model behavior, policy-adjusted behavior, evidence integrity, latency, token usage, and editorial outcomes before a candidate can move closer to production.</p>
      </div>
      <div className="migration-principles">
        <div><span>01</span><strong>Evaluate the model</strong><p>Use one versioned dataset and production contract.</p></div>
        <div><span>02</span><strong>Govern the decision</strong><p>Preserve raw output while applying deterministic safeguards.</p></div>
        <div><span>03</span><strong>Protect production</strong><p>Keep traffic, persistence, and publication isolated.</p></div>
      </div>
    </section>

    <section className="landing-section technology-section">
      <SectionHeading eyebrow="Technology" title="Built on a production-ready stack" copy="Typed contracts, managed infrastructure, deterministic validation, and reproducible tests support every layer." />
      <div className="technology-grid">
        {technologies.map(([mark, name]) => <div className="technology-chip" key={name}><span>{mark}</span><strong>{name}</strong></div>)}
      </div>
    </section>

    <section className="landing-section safety-section">
      <SectionHeading eyebrow="Safety & governance" title="Every boundary is explicit." copy="The platform is designed so that a successful model response is only the beginning of evaluation—not permission to publish or deploy." />
      <div className="safety-grid">
        {safetyControls.map(([title, copy]) => <article key={title}>
          <div className="safety-check"><CheckIcon /></div><h3>{title}</h3><p>{copy}</p>
        </article>)}
      </div>
    </section>

    <section className="cta-section governance-cta">
      <p className="eyebrow">Building Trust Before Deployment</p>
      <h2>Better AI starts with better governance.</h2>
      <p>LAFRYHI AI Radar makes model evaluation measurable, editorial decisions explainable, and production migration accountable.</p>
      <div className="hero-actions">
        <a className="button-link button-primary" href={architectureUrl} target="_blank" rel="noreferrer">Explore the Architecture <ArrowIcon /></a>
        <a className="button-link secondary" href={repositoryUrl} target="_blank" rel="noreferrer">View on GitHub</a>
      </div>
    </section>
  </>;
}
