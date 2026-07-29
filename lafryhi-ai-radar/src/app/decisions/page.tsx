import Link from "next/link";
import { getAnonymousSessionId } from "@/auth/anonymous-session";
import { DecisionActionStatusSchema, type DecisionActionStatus } from "@/domain/decision-progress";
import { getRepository } from "@/persistence";
import { listDecisionBriefsWithProgress } from "@/services/decision-progress";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Decision Briefs | LAFRYHI AI Radar" };

const filters: Array<{ label: string; value?: DecisionActionStatus }> = [
  { label: "All" },
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Abandoned", value: "ABANDONED" },
];

export default async function DecisionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ownerId = await getAnonymousSessionId();
  const requested = (await searchParams).status;
  const parsed = DecisionActionStatusSchema.safeParse(requested);
  const status = parsed.success ? parsed.data : undefined;
  const rows = ownerId ? await listDecisionBriefsWithProgress(await getRepository(), ownerId, status) : [];
  return <section className="public-shell">
    <div className="section-heading"><div><p className="eyebrow">Decision History</p><h1>My Decision Briefs</h1></div><Link className="button-link" href="/decisions/new">Generate a Decision Brief</Link></div>
    <nav className="decision-filters" aria-label="Filter Decision Briefs">{filters.map((filter) => <Link key={filter.label} href={filter.value ? `/decisions?status=${filter.value}` : "/decisions"} className={filter.value === status || (!filter.value && !status) ? "active" : ""}>{filter.label}</Link>)}</nav>
    <div className="stack decision-list">
      {rows.length === 0 && <div className="panel empty-state"><h2>No matching Decision Briefs</h2><p>Create a new brief or choose another action-status filter.</p></div>}
      {rows.map(({ brief, progress }) => <article className="panel" key={brief.id}>
        <div className="meta"><span>{brief.businessName}</span><span>{new Date(brief.createdAt).toLocaleDateString()}</span></div>
        <h2>{brief.signalSnapshot.title}</h2>
        <p>{brief.result.status === "READY" ? brief.result.decisionBrief.decisionQuestion : "Insufficient verified evidence for a recommendation."}</p>
        <div className="decision-list-status">
          <span>Position <strong>{brief.result.status === "READY" ? brief.result.decisionBrief.recommendedPosition.replaceAll("_", " ") : "INSUFFICIENT EVIDENCE"}</strong></span>
          <span>Score <strong>{brief.result.status === "READY" ? brief.result.decisionBrief.score.decisionScore : "—"}</strong></span>
          <span>Usefulness <strong>{progress.feedback?.usefulness.replaceAll("_", " ") ?? "NOT RATED"}</strong></span>
          <span>Action <strong>{progress.actionStatus.replaceAll("_", " ")}</strong></span>
          {progress.action?.outcome && <span>Outcome <strong>{progress.action.outcome}</strong></span>}
        </div>
        <Link className="text-link" href={`/decisions/${brief.id}`}>Read Decision Brief →</Link>
      </article>)}
    </div>
  </section>;
}
