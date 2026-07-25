import Link from "next/link";
import { getRepository } from "@/persistence";
import { getDashboardData } from "@/services/operator-dashboard";
import { logOperatorEvent } from "@/services/operator-events";
import { ReviewQueue } from "@/components/operator/review-queue";
import { StatusBadge } from "@/components/operator/status-badge";

export const dynamic = "force-dynamic";

function Distribution({ values, empty }: { values: Array<{ label: string; count: number }>; empty: string }) {
  if (!values.length) return <p className="muted">{empty}</p>;
  return <ul className="metric-list">{values.map((value) => <li key={value.label}><span>{value.label}</span><strong>{value.count}</strong></li>)}</ul>;
}

export default async function OperatorDashboard() {
  const data = await getDashboardData(await getRepository());
  logOperatorEvent({ event: "operator.dashboard_viewed", action: "view_dashboard" });
  const cards = [
    ["Pending reviews", data.counts.pendingReviews, "/operator/review?status=pending"],
    ["Approved analyses", data.counts.approvedReviews, "/operator/review?status=approved"],
    ["Rejected analyses", data.counts.rejectedReviews, "/operator/rejected"],
    ["Published items", data.counts.publishedItems, "/operator/published"],
    ["Failed runs", data.counts.failedRuns, "/operator/runs?status=failed"],
    ["Completed runs", data.counts.completedRuns, "/operator/runs?status=pending_review"],
    ["Processed sources", data.counts.totalSources, "/operator/sources"],
  ] as const;
  return <>
    <div className="page-heading"><div><p className="eyebrow">Decision control center</p><h1>Operator dashboard</h1><p className="lede">AI prepares evidence-based recommendations. A human operator remains responsible for every publication decision.</p></div><StatusBadge value={process.env.NODE_ENV === "production" ? "production" : "local"} /></div>
    <div className="metric-grid">{cards.map(([label, value, href]) => <Link href={href} className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></Link>)}</div>
    <section><div className="section-heading"><div><p className="eyebrow">Decision intelligence</p><h2>Analysis metrics</h2></div><small>Bounded to the latest 100 analysis records.</small></div>
      <div className="metric-grid">
        <div className="metric-card"><span>Average importance</span><strong>{data.decisionMetrics.averageImportance}</strong></div>
        <div className="metric-card"><span>Average confidence</span><strong>{data.decisionMetrics.averageConfidence}</strong></div>
        <div className="metric-card"><span>Duplicate rate</span><strong>{data.decisionMetrics.duplicateRate}%</strong></div>
      </div>
      <div className="dashboard-grid">
        <div className="panel"><h3>Most common technologies</h3><Distribution values={data.decisionMetrics.mostCommonTechnologies} empty="No technologies extracted yet." /></div>
        <div className="panel"><h3>Most common companies</h3><Distribution values={data.decisionMetrics.mostCommonCompanies} empty="No companies extracted yet." /></div>
        <div className="panel"><h3>Top categories</h3><Distribution values={data.decisionMetrics.topCategories} empty="No categories available." /></div>
        <div className="panel"><h3>Recommendation distribution</h3><Distribution values={data.decisionMetrics.recommendationDistribution} empty="No recommendations available." /></div>
      </div>
    </section>
    <section><div className="section-heading"><h2>Latest pending reviews</h2><Link href="/operator/review">View queue</Link></div><ReviewQueue entries={data.pending} empty="No analyses currently require a human decision." /></section>
    <div className="dashboard-grid">
      <section className="panel"><h2>Latest approved item</h2>{data.latestApproved ? <><StatusBadge value="approved" /><h3>{data.latestApproved.source.title}</h3><Link href={`/operator/review/${data.latestApproved.analysis.id}`}>Open review evidence</Link></> : <p className="muted">No approved analysis exists.</p>}</section>
      <section className="panel"><h2>Latest failed run</h2>{data.latestFailedRun ? <><StatusBadge value="failed" /><code>{data.latestFailedRun.id}</code><p>{data.latestFailedRun.errorDetails || "No safe error detail recorded."}</p></> : <p className="muted">No failed processing run exists.</p>}</section>
      <section className="panel"><h2>Pipeline completion</h2><p className="metric-time">{data.lastSuccessfulCompletion ? new Date(data.lastSuccessfulCompletion).toLocaleString() : "No successful completion recorded."}</p><small>Latest persisted processing run with pending human review.</small></section>
    </div>
  </>;
}
