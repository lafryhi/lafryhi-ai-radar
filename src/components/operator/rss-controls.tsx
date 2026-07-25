"use client";

import { useState } from "react";
import { discoverSourceNow, processDiscoveredCandidate } from "@/app/operator/actions";

export function DiscoverSourceButton({ sourceDefinitionId, eligible, hasFeed }: { sourceDefinitionId: string; eligible: boolean; hasFeed: boolean }) {
  const [busy, setBusy] = useState(false);
  if (!hasFeed) return <p className="muted">No RSS or Atom URL is configured. Discovery will be skipped safely.</p>;
  if (!eligible) return <p className="muted">Discovery is unavailable until this source is enabled with Official, Verified, or Community trust.</p>;
  return <form action={discoverSourceNow} onSubmit={(event) => { if (!window.confirm("Retrieve and inspect this source's configured feed now? No article will be published automatically.")) event.preventDefault(); else setBusy(true); }}>
    <input type="hidden" name="sourceDefinitionId" value={sourceDefinitionId} />
    <button disabled={busy}>{busy ? "Discovering…" : "Discover now"}</button>
  </form>;
}

export function ProcessCandidateButton({ candidateId, sourceDefinitionId }: { candidateId: string; sourceDefinitionId: string }) {
  const [busy, setBusy] = useState(false);
  return <form action={processDiscoveredCandidate} onSubmit={(event) => { if (!window.confirm("Retrieve this article and run Gemini analysis? The result will remain pending until human review.")) event.preventDefault(); else setBusy(true); }}>
    <input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="sourceDefinitionId" value={sourceDefinitionId} />
    <button disabled={busy}>{busy ? "Processing…" : "Process candidate"}</button>
  </form>;
}
