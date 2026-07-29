import Link from "next/link";
import { getAnonymousSessionId } from "@/auth/anonymous-session";
import type { RateMetric } from "@/domain/analytics";
import { getRepository } from "@/persistence";
import { getUserImpactMetrics } from "@/services/analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Impact | LAFRYHI AI Radar" };

const percentage = (metric: RateMetric) => metric.value === null ? "Not enough data" : `${Math.round(metric.value * 100)}%`;
const label = (value: string) => value.replaceAll("_", " ");

export default async function ImpactPage() {
  const ownerId = await getAnonymousSessionId();
  if (!ownerId) return <section className="public-shell"><p className="eyebrow">Owner-scoped analytics</p><h1>My Impact</h1><div className="panel empty-state"><h2>No activity for this browser session</h2><p>Create a Business Profile and generate a Decision Brief to begin measuring decision activity.</p><Link className="button-link" href="/get-started">Get Started</Link></div></section>;
  const metrics = await getUserImpactMetrics(await getRepository(), ownerId);
  return <section className="public-shell">
    <p className="eyebrow">Owner-scoped analytics</p><h1>My Impact</h1>
    <p className="section-copy">Measured activity from this anonymous browser session. Outcomes are user-reported and do not prove financial value.</p>
    <AnalyticsSection title="Overview"><Metric label="Business Profiles" value={metrics.businessProfiles} /><Metric label="Decision Briefs" value={metrics.totalDecisionBriefs} /><Metric label="Average Decision Score" value={metrics.averageDecisionScore === null ? "Not enough data" : metrics.averageDecisionScore.toFixed(1)} /><Metric label="Useful Rate" value={percentage(metrics.usefulnessRate)} /></AnalyticsSection>
    <AnalyticsSection title="Decision Activity"><Metric label="Useful" value={metrics.usefulDecisionBriefs} /><Metric label="Not Useful" value={metrics.notUsefulDecisionBriefs} /><Metric label="Not Rated" value={metrics.notRatedDecisionBriefs} /><Metric label="Action Start Rate" value={percentage(metrics.actionStartRate)} /></AnalyticsSection>
    <AnalyticsSection title="Action Progress"><Metric label="Not Started" value={metrics.actionsNotStarted} /><Metric label="In Progress" value={metrics.actionsInProgress} /><Metric label="Completed" value={metrics.actionsCompleted} /><Metric label="Abandoned" value={metrics.actionsAbandoned} /><Metric label="Completion Rate" value={percentage(metrics.actionCompletionRate)} /></AnalyticsSection>
    <AnalyticsSection title="Reported Outcomes"><Metric label="Positive" value={metrics.positiveOutcomes} /><Metric label="Neutral" value={metrics.neutralOutcomes} /><Metric label="Negative" value={metrics.negativeOutcomes} /><Metric label="Unknown" value={metrics.unknownOutcomes} /><Metric label="Positive Outcome Rate" value={percentage(metrics.positiveOutcomeRate)} /></AnalyticsSection>
    <section className="analytics-section"><h2>Decision Timeline</h2>{metrics.timeline.length === 0 ? <p className="muted">No decision events yet.</p> : <ol className="timeline">{metrics.timeline.map((event, index) => <li key={`${event.decisionBriefId}-${event.type}-${event.timestamp}-${index}`}><time>{new Date(event.timestamp).toLocaleString()}</time><strong>{label(event.type)}</strong><span>{event.title}</span><small>{event.position ? label(event.position) : "Insufficient evidence"} · Current status {label(event.actionStatus)}{event.outcome ? ` · Outcome ${label(event.outcome)}` : ""}</small></li>)}</ol>}</section>
  </section>;
}

function AnalyticsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="analytics-section"><h2>{title}</h2><div className="analytics-metrics">{children}</div></section>;
}
function Metric({ label: name, value }: { label: string; value: string | number }) {
  return <article className="metric-card"><span>{name}</span><strong>{value}</strong></article>;
}
