import { requireOperator } from "@/auth/operator";
import { OperatorNav } from "@/components/operator/operator-nav";

export default async function OperatorWorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireOperator();
  return <div className="operator-shell" dir="auto"><OperatorNav /><div className="operator-content">{children}</div></div>;
}
