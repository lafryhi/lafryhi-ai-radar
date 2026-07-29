import { getRepository } from "@/persistence";
import { getRevenueMetrics } from "@/services/revenue-analytics";
export const dynamic = "force-dynamic";
export default async function RevenuePage() {
  const m = await getRevenueMetrics(await getRepository());
  const cards = [["Free owners",m.freeOwners],["Pro owners",m.proOwners],["Active subscriptions",m.activeSubscriptions],["Past due",m.pastDueSubscriptions],["Canceled",m.canceledSubscriptions],["Verified transactions",m.verifiedTransactions],["Estimated MRR",`$${(m.estimatedMrrCents/100).toFixed(2)}`],["Paid briefs this month",m.currentMonthPaidDecisionUsage]];
  return <div><div className="page-heading"><div><p className="eyebrow">Verified billing records only</p><h1>Revenue</h1></div></div><p className="muted">Estimated MRR is active verified subscriptions × plan price. It is not recognized accounting revenue. No emails, owner IDs, Paddle IDs, or raw payloads are shown.</p>
    <div className="metric-grid">{cards.map(([label,value])=><article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <section className="panel"><h2>Commercial funnel</h2><div className="funnel">{Object.entries(m.funnel).map(([label,count])=><article key={label}><span>{label.replaceAll("_"," ")}</span><strong>{count}</strong></article>)}</div></section>
    <section className="panel"><h2>New Pro subscriptions by month</h2>{m.newProByMonth.length ? <ul>{m.newProByMonth.map((x)=><li key={x.month}>{x.month}: {x.count}</li>)}</ul> : <p>Not enough verified subscription data.</p>}<p>Decision-owner to Pro conversion: {m.decisionOwnersToProRate===null?"Not enough data":`${Math.round(m.decisionOwnersToProRate*100)}%`}</p></section>
  </div>;
}
