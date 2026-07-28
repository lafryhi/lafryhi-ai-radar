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
    ["Pending verifications", data.counts.pendingReviews, "/operator/review?status=pending"],
    ["Verified analyses", data.counts.approvedReviews, "/operator/review?status=approved"],
    ["Rejected intelligence", data.counts.rejectedReviews, "/operator/rejected"],
    ["Decision Briefs", data.counts.publishedItems, "/operator/published"],
    ["Failed runs", data.counts.failedRuns, "/operator/runs?status=failed"],
    ["Completed runs", data.counts.completedRuns, "/operator/runs?status=pending_review"],
    ["Processed signals", data.counts.totalSources, "/operator/sources"],
  ] as const;
  return <>
    <div className="page-heading"><div><p className="eyebrow">Intelligence operations</p><h1>Decision Center</h1><p className="lede">Gemini prepares evidence-based decision intelligence. Human Verification remains responsible for every published Decision Brief.</p></div><StatusBadge value={process.env.NODE_ENV === "production" ? "production" : "local"} /></div>
    <div className="metric-grid">{cards.map(([label, value, href]) => <Link href={href} className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></Link>)}</div>
    <section><div className="section-heading"><div><p className="eyebrow">Decision intelligence</p><h2>Gemini Intelligence metrics</h2></div><small>Bounded to the latest 100 Gemini Analysis records.</small></div>
      <div className="metric-grid">
        <div className="metric-card"><span>Average importance</span><strong>{data.decisionMetrics.averageImportance}</strong></div>
        <div className="metric-card"><span>Average confidence</span><strong>{data.decisionMetrics.averageConfidence}</strong></div>
        <div className="metric-card"><span>Duplicate rate</span><strong>{data.decisionMetrics.duplicateRate}%</strong></div>
      </div>
      <div className="dashboard-grid">
        <div className="panel"><h3>Most common technologies</h3><Distribution values={data.decisionMetrics.mostCommonTechnologies} empty="No technologies extracted yet." /></div>
        <div className="panel"><h3>Most common companies</h3><Distribution values={data.decisionMetrics.mostCommonCompanies} empty="No companies extracted yet." /></div>
        <div className="panel"><h3>Top categories</h3><Distribution values={data.decisionMetrics.topCategories} empty="No categories available." /></div>
        <div className="panel"><h3>Recommended Action distribution</h3><Distribution values={data.decisionMetrics.recommendationDistribution} empty="No Recommended Actions available." /></div>
      </div>
    </section>
    <section><div className="section-heading"><h2>Signals awaiting verification</h2><Link href="/operator/review">Open Verification Queue</Link></div><ReviewQueue entries={data.pending} empty="No Gemini Analyses currently require Human Verification." /></section>
    <div className="dashboard-grid">
      <section className="panel"><h2>Latest Decision Brief</h2>{data.latestApproved ? <><StatusBadge value="verified" /><h3>{data.latestApproved.source.title}</h3><Link href={`/operator/review/${data.latestApproved.analysis.id}`}>Open verification evidence</Link></> : <p className="muted">No verified Gemini Analysis exists.</p>}</section>
      <section className="panel"><h2>Latest failed intelligence run</h2>{data.latestFailedRun ? <><StatusBadge value="failed" /><code>{data.latestFailedRun.id}</code><p>{data.latestFailedRun.errorDetails || "No safe error detail recorded."}</p></> : <p className="muted">No failed intelligence run exists.</p>}</section>
      <section className="panel"><h2>Pipeline completion</h2><p className="metric-time">{data.lastSuccessfulCompletion ? new Date(data.lastSuccessfulCompletion).toLocaleString() : "No successful completion recorded."}</p><small>Latest persisted Gemini Analysis awaiting Human Verification.</small></section>
    </div>
  </>;
}
