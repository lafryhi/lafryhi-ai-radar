import { getRepository } from "@/persistence";
import { getReviewQueue } from "@/services/operator-dashboard";
import { ReviewQueue } from "@/components/operator/review-queue";

export const dynamic = "force-dynamic";

type Params = {
  status?: string; category?: string; publisher?: string; company?: string; technology?: string;
  recommendation?: string; relevance?: string; importance?: string; novelty?: string; confidence?: string;
  sort?: "newest" | "oldest" | "relevance" | "importance" | "novelty" | "confidence"; error?: string;
};

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const entries = await getReviewQueue(await getRepository(), {
    status: params.status,
    category: params.category,
    publisher: params.publisher,
    company: params.company,
    technology: params.technology,
    recommendation: params.recommendation,
    minRelevance: params.relevance ? Number(params.relevance) : undefined,
    minImportance: params.importance ? Number(params.importance) : undefined,
    minNovelty: params.novelty ? Number(params.novelty) : undefined,
    minConfidence: params.confidence ? Number(params.confidence) : undefined,
    sort: params.sort,
  });
  return <>
    <div className="page-heading"><div><p className="eyebrow">Human review queue</p><h1>Review analyses</h1><p className="lede">Inspect source evidence and Gemini interpretation before making a deliberate decision.</p></div></div>
    {params.error && <p className="error">The request was rejected safely. Refresh and try again.</p>}
    <form className="filter-bar" method="get">
      <label>Status<select name="status" defaultValue={params.status || "all"}><option value="all">All</option><option value="pending">Pending</option><option value="needs_changes">Needs changes</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="published">Published</option></select></label>
      <label>Category<input name="category" defaultValue={params.category || ""} placeholder="e.g. model_release" /></label>
      <label>Source<input name="publisher" defaultValue={params.publisher || ""} placeholder="Publisher or domain" /></label>
      <label>Company<input name="company" defaultValue={params.company || ""} /></label>
      <label>Technology<input name="technology" defaultValue={params.technology || ""} /></label>
      <label>Recommendation<select name="recommendation" defaultValue={params.recommendation || "all"}><option value="all">All</option><option>Publish</option><option>Needs Human Attention</option><option>Archive</option><option>Reject</option></select></label>
      <label>Min relevance<input name="relevance" type="number" min="0" max="100" defaultValue={params.relevance || ""} /></label>
      <label>Min importance<input name="importance" type="number" min="0" max="100" defaultValue={params.importance || ""} /></label>
      <label>Min novelty<input name="novelty" type="number" min="0" max="100" defaultValue={params.novelty || ""} /></label>
      <label>Min confidence<input name="confidence" type="number" min="0" max="100" defaultValue={params.confidence || ""} /></label>
      <label>Sort<select name="sort" defaultValue={params.sort || "newest"}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="relevance">Relevance</option><option value="importance">Importance</option><option value="novelty">Novelty</option><option value="confidence">Confidence</option></select></label>
      <button>Apply filters</button>
    </form>
    <p className="muted">{entries.length} result{entries.length === 1 ? "" : "s"} · bounded to the latest 100 records</p>
    <ReviewQueue entries={entries} />
  </>;
}
