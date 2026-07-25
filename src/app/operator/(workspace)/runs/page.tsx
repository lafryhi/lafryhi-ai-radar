import { getRepository } from "@/persistence";
import { StatusBadge } from "@/components/operator/status-badge";

export const dynamic = "force-dynamic";

export default async function Runs({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const repository = await getRepository();
  const [all, discoveryRuns] = await Promise.all([repository.listRuns(100), repository.listRssDiscoveryRuns(undefined, 50)]);
  const runs = status ? all.filter((run) => run.status === status) : all;
  return <><p className="eyebrow">Processing evidence</p><h1>Pipeline runs</h1><p className="lede">Bounded operational history for initial processing and reruns.</p>
    <div className="stack">{runs.map((run) => <article className="panel compact" key={run.id}><div className="split"><div><StatusBadge value={run.status} /> <StatusBadge value={run.validationOutcome} /></div><time>{new Date(run.startedAt).toLocaleString()}</time></div><code>{run.id}</code><dl className="detail-grid"><div><dt>Source ID</dt><dd><code>{run.sourceRecordId}</code></dd></div><div><dt>Model</dt><dd>{run.model}</dd></div><div><dt>Prompt version</dt><dd>{run.promptVersion}</dd></div><div><dt>Latency</dt><dd>{run.latencyMs === null ? "In progress" : `${run.latencyMs} ms`}</dd></div><div><dt>Retry count</dt><dd>{run.retryCount}</dd></div><div><dt>Tokens</dt><dd>{run.tokenUsage?.totalTokens ?? "Not reported"}</dd></div></dl>{run.errorDetails && <p className="error">{run.errorDetails}</p>}</article>)}{runs.length === 0 && <div className="panel empty">No runs match this view.</div>}</div>
    <h2>RSS discovery runs</h2><p className="lede">Metadata-only discovery never invokes Gemini or publication.</p><div className="stack">{discoveryRuns.map((run) => <article className="panel compact" key={run.id}><div className="split"><div><StatusBadge value={run.status} /> <StatusBadge value={run.trigger} /></div><time>{new Date(run.startedAt).toLocaleString()}</time></div><code>{run.id}</code><dl className="detail-grid"><div><dt>Source registry ID</dt><dd><code>{run.sourceDefinitionId || "bounded scheduled set"}</code></dd></div><div><dt>Sources</dt><dd>{run.sourcesConsidered}</dd></div><div><dt>Items examined</dt><dd>{run.itemsExamined}</dd></div><div><dt>Accepted</dt><dd>{run.candidatesAccepted}</dd></div><div><dt>Duplicates</dt><dd>{run.duplicates}</dd></div><div><dt>Skipped / validation</dt><dd>{run.skippedItems} / {run.validationFailures}</dd></div></dl></article>)}{!discoveryRuns.length && <div className="panel empty">No discovery runs recorded.</div>}</div>
  </>;
}
