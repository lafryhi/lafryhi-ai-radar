import Link from "next/link";
import { logout } from "@/app/operator/actions";

export function OperatorNav() {
  return <aside className="operator-nav" aria-label="Operator navigation">
    <div><p className="eyebrow">Human Verification</p><strong>Intelligence operations</strong></div>
    <nav>
      <Link href="/operator">Decision Center</Link>
      <Link href="/operator/review">Verification Queue</Link>
      <Link href="/operator/published">Decision Briefs</Link>
      <Link href="/operator/rejected">Rejected Intelligence</Link>
      <Link href="/operator/sources">Trusted Sources</Link>
      <Link href="/operator/runs">Intelligence Runs</Link>
      <Link href="/operator/analytics">Product Analytics</Link>
    </nav>
    <form action={logout}><button className="secondary">Sign out</button></form>
  </aside>;
}
