"use client";
import { useState } from "react";
import { changeManagedSourceStatus } from "@/app/operator/actions";

export function SourceActions({ sourceDefinitionId, status, trust }: { sourceDefinitionId: string; status: string; trust: string }) {
  const [busy, setBusy] = useState(false);
  if (status === "archived") return <p className="muted">Archived sources are read-only.</p>;
  const actions = [
    ...(status !== "enabled" && ["official", "verified", "community"].includes(trust) ? [["enable", "Enable", "Enable this trusted source for production intake?"]] : []),
    ...(status !== "disabled" && status !== "blocked" ? [["disable", "Disable", "Disable this source and prevent new processing?"]] : []),
    ...(status !== "blocked" ? [["block", "Block", "Block this source? It cannot enter production."]] : []),
    ["archive", "Archive", "Archive this source permanently as read-only?"],
  ];
  return <div className="source-actions">{actions.map(([action, label, prompt]) => <form action={changeManagedSourceStatus} key={action} onSubmit={(event) => { if (!window.confirm(prompt)) event.preventDefault(); else setBusy(true); }}><input type="hidden" name="sourceDefinitionId" value={sourceDefinitionId} /><input type="hidden" name="sourceAction" value={action} /><button disabled={busy} className={action === "block" || action === "archive" ? "danger" : action === "disable" ? "secondary" : ""}>{label}</button></form>)}</div>;
}
