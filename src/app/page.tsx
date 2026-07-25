import { getRepository } from "@/persistence";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await (await getRepository()).listPublishedItems();
  return <section>
    <p className="eyebrow">Verified decision intelligence</p>
    <h1>Discover what matters.<br />Decide what to do next.</h1>
    <p className="lede">Only records approved by a human operator appear here. Every item retains its original source and processing provenance.</p>
    <div className="stack">
      {items.length === 0 && <div className="panel"><h2>No approved items yet</h2><p>The public feed remains empty until a real authoritative source is analyzed and approved.</p></div>}
      {items.map((item) => <article className="panel" key={item.id}>
        <div className="meta"><span>{item.category.replaceAll("_", " ")}</span><span>{new Date(item.sourcePublishedAt).toLocaleDateString()}</span></div>
        <h2>{item.publicTitle}</h2>
        <p>{item.publicSummary}</p>
        <h3>Why it matters</h3><p>{item.whyItMatters}</p>
        <h3>Recommended action</h3><p>{item.recommendedAction}</p>
        <div className="scores"><span>Relevance {item.relevanceScore}/100</span><span>Confidence {item.confidenceScore}/100</span></div>
        <p className="trace">AI-analyzed and human-reviewed · Source: <a href={item.originalSourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceName}</a></p>
        <details><summary>Traceability</summary><code>source {item.sourceRecordId}<br />run {item.processingRunId}<br />analysis {item.analysisResultId}<br />review {item.reviewDecisionId}</code></details>
      </article>)}
    </div>
  </section>;
}
