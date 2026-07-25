import Link from "next/link";
import { logout } from "@/app/operator/actions";

export function OperatorNav() {
  return <aside className="operator-nav" aria-label="Operator navigation">
    <div><p className="eyebrow">Human control</p><strong>Operator workspace</strong></div>
    <nav>
      <Link href="/operator">Overview</Link>
      <Link href="/operator/review">Review queue</Link>
      <Link href="/operator/published">Published</Link>
      <Link href="/operator/rejected">Rejected</Link>
      <Link href="/operator/sources">Sources</Link>
      <Link href="/operator/runs">Processing runs</Link>
    </nav>
    <form action={logout}><button className="secondary">Sign out</button></form>
  </aside>;
}
