import { notFound } from "next/navigation";
import { getRepository } from "@/persistence";
import { getSourceStatistics } from "@/services/source-management";
import { SourceForm } from "@/components/operator/source-form";
import { SourceActions } from "@/components/operator/source-actions";
import { StatusBadge } from "@/components/operator/status-badge";
import { DiscoverSourceButton, ProcessCandidateButton } from "@/components/operator/rss-controls";
import { TRUSTED_SOURCE_LEVELS } from "@/services/source-management";

export const dynamic = "force-dynamic";

export default async function SourceDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ result?: string; error?: string; discovery?: string; runId?: string; candidate?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const repository = await getRepository();
  const source = await repository.getSourceDefinition(id);
  if (!source) notFound();
  const [statistics, candidates, discoveryRuns] = await Promise.all([getSourceStatistics(repository, source), repository.listRssCandidates(source.id, 20), repository.listRssDiscoveryRuns(source.id, 10)]);
  const lastDiscovery = discoveryRuns[0] ?? null;
  const eligible = source.status === "enabled" && TRUSTED_SOURCE_LEVELS.includes(source.trustLevel as typeof TRUSTED_SOURCE_LEVELS[number]);
  const safeFeed = source.rssUrl ? (() => { const url = new URL(source.rssUrl); return `${url.origin}${url.pathname}`; })() : null;
  return <>
    <div className="page-heading"><div><p className="eyebrow">{source.publisher}</p><h1>{source.displayName}</h1><p className="lede">{source.canonicalDomain}</p></div><div className="badge-stack"><StatusBadge value={source.status} /><StatusBadge value={source.trustLevel} /></div></div>
    {query.result && <p className="success">Source action completed: {query.result}.</p>}{query.error && <p className="error">The source action was rejected safely (HTTP {query.error}).</p>}
    {query.discovery && <p className={query.discovery === "failed" ? "error" : "success"}>Discovery result: {query.discovery}{query.runId ? ` · run ${query.runId}` : ""}.</p>}{query.candidate && <p className={query.candidate === "processed" ? "success" : "error"}>Candidate processing: {query.candidate}.</p>}
    <div className="metric-grid"><div className="metric-card"><span>Processed articles</span><strong>{statistics.processedArticles}</strong></div><div className="metric-card"><span>Approved</span><strong>{statistics.approved}</strong></div><div className="metric-card"><span>Rejected</span><strong>{statistics.rejected}</strong></div><div className="metric-card"><span>Last processing</span><strong className="metric-small">{statistics.lastProcessingAt ? new Date(statistics.lastProcessingAt).toLocaleDateString() : "Never"}</strong></div></div>
    <section className="panel"><h2>Source controls</h2><p className="muted">State changes are explicit operator actions. Blocking also sets the trust level to Blocked.</p><SourceActions sourceDefinitionId={source.id} status={source.status} trust={source.trustLevel} /></section>
    <section className="panel"><h2>Controlled RSS discovery</h2><dl className="detail-grid"><div><dt>Configured feed</dt><dd>{safeFeed || "Not configured"}</dd></div><div><dt>Last discovery</dt><dd>{lastDiscovery?.completedAt ? new Date(lastDiscovery.completedAt).toLocaleString() : "Never"}</dd></div><div><dt>Last status</dt><dd>{lastDiscovery?.status || "No run"}</dd></div><div><dt>Last accepted count</dt><dd>{lastDiscovery?.candidatesAccepted ?? 0}</dd></div></dl><DiscoverSourceButton sourceDefinitionId={source.id} eligible={eligible} hasFeed={Boolean(source.rssUrl)} /></section>
    <section><div className="section-heading"><h2>Discovered candidates</h2><span className="muted">Metadata only · human processing required</span></div><div className="stack">{candidates.map((candidate) => <article className="panel compact" key={candidate.id}><div className="split"><div><StatusBadge value={candidate.status} /><h3>{candidate.title}</h3></div><time>{new Date(candidate.discoveredAt).toLocaleString()}</time></div><p><a href={candidate.articleUrl} target="_blank" rel="noopener noreferrer">Open canonical article</a></p>{candidate.summary && <p className="muted">{candidate.summary}</p>}{candidate.status === "pending" ? <ProcessCandidateButton candidateId={candidate.id} sourceDefinitionId={source.id} /> : <p className="success">Processed into source record <code>{candidate.sourceRecordId}</code>.</p>}</article>)}{!candidates.length && <div className="panel empty">No RSS candidates have been accepted.</div>}</div></section>
    <section className="panel"><h2>Publisher metadata</h2><dl className="detail-grid"><div><dt>Canonical domain</dt><dd>{source.canonicalDomain}</dd></div><div><dt>Allowed feed domains</dt><dd>{source.allowedFeedDomains.length ? source.allowedFeedDomains.join(", ") : "None"}</dd></div><div><dt>Allowed article domains</dt><dd>{source.allowedArticleDomains.length ? source.allowedArticleDomains.join(", ") : "None"}</dd></div><div><dt>Homepage</dt><dd><a href={source.homepage} target="_blank" rel="noopener noreferrer">Open homepage</a></dd></div><div><dt>RSS feed</dt><dd>{safeFeed || "Not configured"}</dd></div><div><dt>Documentation</dt><dd>{source.documentationUrl ? <a href={source.documentationUrl} target="_blank" rel="noopener noreferrer">Open documentation</a> : "Not configured"}</dd></div><div><dt>Human review</dt><dd>Required</dd></div><div><dt>Created</dt><dd>{new Date(source.createdAt).toLocaleString()}</dd></div><div><dt>Updated</dt><dd>{new Date(source.updatedAt).toLocaleString()}</dd></div><div><dt>Source ID</dt><dd><code>{source.id}</code></dd></div></dl></section>
    <section className="panel"><h2>{source.status === "archived" ? "Archived metadata" : "Update metadata"}</h2><SourceForm source={source} /></section>
  </>;
}
