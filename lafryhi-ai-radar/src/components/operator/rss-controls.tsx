"use client";

import { useState } from "react";
import { discoverSourceNow, processDiscoveredCandidate } from "@/app/operator/actions";

export function DiscoverSourceButton({ sourceDefinitionId, eligible, hasFeed }: { sourceDefinitionId: string; eligible: boolean; hasFeed: boolean }) {
  const [busy, setBusy] = useState(false);
  if (!hasFeed) return <p className="muted">No RSS or Atom URL is configured. Signal discovery will be skipped safely.</p>;
  if (!eligible) return <p className="muted">Signal discovery is unavailable until this source is enabled with Official, Verified, or Community trust.</p>;
  return <form action={discoverSourceNow} onSubmit={(event) => { if (!window.confirm("Scan this trusted source for signals now? No Decision Brief will be published automatically.")) event.preventDefault(); else setBusy(true); }}>
    <input type="hidden" name="sourceDefinitionId" value={sourceDefinitionId} />
    <button disabled={busy}>{busy ? "Scanning…" : "Scan for signals"}</button>
  </form>;
}

export function ProcessCandidateButton({ candidateId, sourceDefinitionId }: { candidateId: string; sourceDefinitionId: string }) {
  const [busy, setBusy] = useState(false);
  return <form action={processDiscoveredCandidate} onSubmit={(event) => { if (!window.confirm("Retrieve this signal evidence and run Gemini Analysis? The result will remain pending until Human Verification.")) event.preventDefault(); else setBusy(true); }}>
    <input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="sourceDefinitionId" value={sourceDefinitionId} />
    <button disabled={busy}>{busy ? "Analyzing…" : "Generate Gemini Analysis"}</button>
  </form>;
}
