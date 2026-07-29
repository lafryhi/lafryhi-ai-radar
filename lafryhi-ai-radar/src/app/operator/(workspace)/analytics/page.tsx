import type { RateMetric } from "@/domain/analytics";
import { getRepository } from "@/persistence";
import { getOperatorProductMetrics } from "@/services/analytics";

export const dynamic = "force-dynamic";
const pct = (metric: RateMetric) => metric.value === null ? "Not enough data" : `${Math.round(metric.value * 100)}%`;
const label = (value: string) => value.replaceAll("_", " ");

export default async function OperatorAnalyticsPage() {
  const metrics = await getOperatorProductMetrics(await getRepository());
  return <div>
    <div className="page-heading"><div><p className="eyebrow">Aggregate behavior only</p><h1>Product Analytics</h1></div></div>
    <p className="muted">Privacy-safe product aggregates. Session IDs, owner IDs, business names, notes, summaries, and raw Gemini output are excluded.</p>
    <section className="analytics-section"><h2>Product Overview</h2><div className="analytics-metrics">
      <Metric label="Business Profiles" value={metrics.totalBusinessProfiles} /><Metric label="Anonymous Owners" value={metrics.totalAnonymousOwners} /><Metric label="Decision Briefs" value={metrics.totalDecisionBriefs} /><Metric label="Ready Decisions" value={metrics.readyDecisionBriefs} /><Metric label="Insufficient Evidence" value={metrics.insufficientEvidenceBriefs} /><Metric label="Usefulness Ratings" value={metrics.totalUsefulnessRatings} /><Metric label="Action Records" value={metrics.totalActionRecords} /><Metric label="Active Industries" value={metrics.activeIndustries} /><Metric label="Signals Used" value={metrics.publishedSignalsUsed} /><Metric label="Average Score" value={metrics.averageDecisionScore?.toFixed(1) ?? "Not enough data"} /><Metric label="Median Score" value={metrics.medianDecisionScore?.toFixed(1) ?? "Not enough data"} />
    </div></section>
    <section className="analytics-section"><h2>Engagement Rates</h2><div className="analytics-metrics"><Metric label="Useful Rate" value={pct(metrics.usefulRate)} /><Metric label="Action Start Rate" value={pct(metrics.actionStartRate)} /><Metric label="Completion Rate" value={pct(metrics.actionCompletionRate)} /><Metric label="Abandonment Rate" value={pct(metrics.actionAbandonmentRate)} /><Metric label="Positive Outcome Rate" value={pct(metrics.positiveOutcomeRate)} /><Metric label="Insufficient Evidence Rate" value={pct(metrics.insufficientEvidenceRate)} /></div></section>
    <section className="analytics-section"><h2>Engagement Funnel</h2><div className="funnel">{metrics.funnel.map((stage) => <article key={stage.label}><strong>{stage.count}</strong><span>{stage.label}</span><small>From previous: {stage.fromPrevious ? pct(stage.fromPrevious) : "Starting point"} · From decisions: {stage.fromDecisionBriefs ? pct(stage.fromDecisionBriefs) : "Not applicable"}</small></article>)}</div></section>
    <AnalyticsTable title="Decision Positions" headers={["Position","Count","Share","Start","Complete","Useful","Positive"]} rows={metrics.positions.map((row) => [label(row.position), row.count, pct(row.percentage), pct(row.actionStartRate), pct(row.actionCompletionRate), pct(row.usefulnessRate), pct(row.positiveOutcomeRate)])} />
    <AnalyticsTable title="Industry Breakdown" headers={["Industry","Profiles","Decisions","Start","Complete","Useful","Positive"]} rows={metrics.industries.map((row) => [row.industry, row.businessProfiles, row.decisionBriefs, pct(row.actionStartRate), pct(row.actionCompletionRate), pct(row.usefulnessRate), pct(row.positiveOutcomeRate)])} />
    <AnalyticsTable title="Action Status" headers={["Status","Count","Share"]} rows={metrics.actionStatuses.map((row) => [label(row.status), row.count, pct(row.percentage)])} />
    <AnalyticsTable title="Outcomes" headers={["Outcome","Count","Share"]} rows={metrics.outcomes.map((row) => [label(row.outcome), row.count, pct(row.percentage)])} />
    <AnalyticsTable title="Most-Used Signals" headers={["Signal","Decisions","Average Score","Useful","Start","Complete"]} rows={metrics.signals.map((row) => [row.title, row.decisionBriefs, row.averageDecisionScore?.toFixed(1) ?? "Not enough data", pct(row.usefulnessRate), pct(row.actionStartRate), pct(row.actionCompletionRate)])} />
  </div>;
}

function Metric({ label: name, value }: { label: string; value: string | number }) { return <article className="metric-card"><span>{name}</span><strong>{value}</strong></article>; }
function AnalyticsTable({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return <section className="analytics-section"><h2>{title}</h2><div className="review-table-wrap"><table className="review-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}
