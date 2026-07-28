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
    <div className="page-heading"><div><p className="eyebrow">Human Verification</p><h1>Verification Queue</h1><p className="lede">Verify trusted-signal evidence and Gemini Intelligence before a Decision Brief becomes available.</p></div></div>
    {params.error && <p className="error">The request was rejected safely. Refresh and try again.</p>}
    <form className="filter-bar" method="get">
      <label>Verification state<select name="status" defaultValue={params.status || "all"}><option value="all">All</option><option value="pending">Pending verification</option><option value="needs_changes">Verification changes</option><option value="approved">Verified</option><option value="rejected">Rejected</option><option value="published">Decision Brief</option></select></label>
      <label>Category<input name="category" defaultValue={params.category || ""} placeholder="e.g. model_release" /></label>
      <label>Source<input name="publisher" defaultValue={params.publisher || ""} placeholder="Publisher or domain" /></label>
      <label>Company<input name="company" defaultValue={params.company || ""} /></label>
      <label>Technology<input name="technology" defaultValue={params.technology || ""} /></label>
      <label>Recommended position<select name="recommendation" defaultValue={params.recommendation || "all"}><option value="all">All</option><option value="Publish">Ready for verification</option><option value="Needs Human Attention">Needs Human Verification</option><option value="Archive">Archive</option><option value="Reject">Reject</option></select></label>
      <label>Min decision score<input name="relevance" type="number" min="0" max="100" defaultValue={params.relevance || ""} /></label>
      <label>Min importance<input name="importance" type="number" min="0" max="100" defaultValue={params.importance || ""} /></label>
      <label>Min novelty<input name="novelty" type="number" min="0" max="100" defaultValue={params.novelty || ""} /></label>
      <label>Min confidence<input name="confidence" type="number" min="0" max="100" defaultValue={params.confidence || ""} /></label>
      <label>Sort<select name="sort" defaultValue={params.sort || "newest"}><option value="newest">Latest signals</option><option value="oldest">Oldest signals</option><option value="relevance">Decision score</option><option value="importance">Importance</option><option value="novelty">Novelty</option><option value="confidence">Confidence</option></select></label>
      <button>Apply filters</button>
    </form>
    <p className="muted">{entries.length} result{entries.length === 1 ? "" : "s"} · bounded to the latest 100 records</p>
    <ReviewQueue entries={entries} />
  </>;
}
