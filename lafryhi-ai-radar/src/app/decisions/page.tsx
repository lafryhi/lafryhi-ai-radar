import Link from "next/link";
import { getAnonymousSessionId } from "@/auth/anonymous-session";
import { getRepository } from "@/persistence";
import { listOwnedDecisionBriefs } from "@/services/public-mvp";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Decision Briefs | LAFRYHI AI Radar" };

export default async function DecisionsPage() {
  const ownerId = await getAnonymousSessionId();
  const briefs = ownerId ? await listOwnedDecisionBriefs(await getRepository(), ownerId) : [];
  return <section className="public-shell">
    <div className="section-heading"><div><p className="eyebrow">Decision History</p><h1>My Decision Briefs</h1></div><Link className="button-link" href="/decisions/new">Generate a Decision Brief</Link></div>
    <div className="stack decision-list">
      {briefs.length === 0 && <div className="panel empty-state"><h2>No Decision Briefs yet</h2><p>Create a Business Profile and select a Trusted Signal to generate your first brief.</p></div>}
      {briefs.map((brief) => <article className="panel" key={brief.id}>
        <div className="meta"><span>{brief.businessName}</span><span>{new Date(brief.createdAt).toLocaleDateString()}</span></div>
        <h2>{brief.signalSnapshot.title}</h2>
        <p>{brief.result.status === "READY" ? brief.result.decisionBrief.decisionQuestion : "Insufficient verified evidence for a recommendation."}</p>
        <Link className="text-link" href={`/decisions/${brief.id}`}>Read Decision Brief →</Link>
      </article>)}
    </div>
  </section>;
}
