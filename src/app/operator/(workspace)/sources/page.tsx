import Link from "next/link";
import { getRepository } from "@/persistence";
import { listManagedSources, SOURCE_QUERY_LIMIT } from "@/services/source-management";
import { StatusBadge } from "@/components/operator/status-badge";
import { SourceForm } from "@/components/operator/source-form";

export const dynamic = "force-dynamic";
type Params = { status?: string; trust?: string; category?: string; publisher?: string; sort?: "updated" | "name" | "publisher"; page?: string; error?: string };
function query(params: Params, page: number) { const values = new URLSearchParams(); for (const [key, value] of Object.entries({ ...params, page: String(page) })) if (value && key !== "error") values.set(key, value); return `?${values.toString()}`; }

export default async function Sources({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const repository = await getRepository();
  const [result, total, registry] = await Promise.all([
    listManagedSources(repository, { ...params, page: Number(params.page || "1") }),
    repository.countSourceDefinitions(),
    repository.listSourceDefinitions(SOURCE_QUERY_LIMIT),
  ]);
  return <>
    <div className="page-heading"><div><p className="eyebrow">Trusted information registry</p><h1>Source management</h1><p className="lede">Only enabled sources with Official, Verified, or Community trust can enter production intake.</p></div></div>
    {params.error && <p className="error">The source request was rejected safely (HTTP {params.error}).</p>}
    <div className="metric-grid"><div className="metric-card"><span>Registered</span><strong>{total}</strong></div><div className="metric-card"><span>Enabled</span><strong>{registry.filter((x) => x.status === "enabled").length}</strong></div><div className="metric-card"><span>Blocked</span><strong>{registry.filter((x) => x.status === "blocked").length}</strong></div><div className="metric-card"><span>Experimental</span><strong>{registry.filter((x) => x.trustLevel === "experimental").length}</strong></div></div>
    <details className="panel"><summary>Register a trusted source</summary><SourceForm /></details>
    <form className="filter-bar" method="get">
      <label>Status<select name="status" defaultValue={params.status || "all"}><option value="all">All</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option><option value="blocked">Blocked</option><option value="archived">Archived</option></select></label>
      <label>Trust<select name="trust" defaultValue={params.trust || "all"}><option value="all">All</option><option value="official">Official</option><option value="verified">Verified</option><option value="community">Community</option><option value="experimental">Experimental</option><option value="blocked">Blocked</option></select></label>
      <label>Category<input name="category" defaultValue={params.category || ""} placeholder="e.g. research_lab" /></label>
      <label>Publisher<input name="publisher" defaultValue={params.publisher || ""} /></label>
      <label>Sort<select name="sort" defaultValue={params.sort || "updated"}><option value="updated">Recently updated</option><option value="name">Name</option><option value="publisher">Publisher</option></select></label>
      <button>Apply filters</button>
    </form>
    <p className="muted">{result.totalFiltered} matching source{result.totalFiltered === 1 ? "" : "s"} · page {result.page} · bounded registry query {SOURCE_QUERY_LIMIT}</p>
    <div className="source-grid">{result.sources.map((source) => <article className="panel compact" key={source.id}><div className="split"><div><p className="eyebrow">{source.publisher}</p><h2>{source.displayName}</h2></div><div className="badge-stack"><StatusBadge value={source.status} /><StatusBadge value={source.trustLevel} /></div></div><p><code>{source.canonicalDomain}</code></p><p className="muted">{source.category.replaceAll("_", " ")} · {source.language.toUpperCase()} · {source.country}</p><Link className="button-link" href={`/operator/sources/${source.id}`}>Manage source</Link></article>)}{result.sources.length === 0 && <div className="panel empty"><h2>No registered sources</h2><p>Register a source manually before attempting production intake.</p></div>}</div>
    <nav className="pagination" aria-label="Source pages">{result.page > 1 && <Link className="button-link secondary" href={query(params, result.page - 1)}>Previous</Link>}{result.hasNext && <Link className="button-link secondary" href={query(params, result.page + 1)}>Next</Link>}</nav>
  </>;
}
