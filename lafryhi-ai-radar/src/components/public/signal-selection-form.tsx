"use client";

import { useActionState, useState } from "react";
import type { PublicSignal } from "@/domain/public-mvp";
import { generateDecisionBriefAction, type PublicActionState } from "@/app/public-actions";

const initialState: PublicActionState = { status: "idle", message: "" };

export function SignalSelectionForm({ signals, businessProfileId }: { signals: PublicSignal[]; businessProfileId: string }) {
  const [state, action, pending] = useActionState(generateDecisionBriefAction, initialState);
  const [generationRequestId] = useState(() => crypto.randomUUID());
  return <form action={action} className="public-form">
    <input type="hidden" name="businessProfileId" value={businessProfileId} />
    <input type="hidden" name="generationRequestId" value={generationRequestId} />
    <fieldset className="signal-options"><legend className="sr-only">Available Trusted Signals</legend>
      {signals.map((signal) => <label className="signal-option" key={signal.id}>
        <input type="radio" name="signalId" value={signal.id} required />
        <span><strong>{signal.title}</strong><small>{signal.description}</small><span className="meta">{signal.sourceName} · {new Date(signal.publishedAt).toLocaleDateString()} · Public indicator {signal.signalImportance}/100</span></span>
      </label>)}
    </fieldset>
    <button className="button-link" type="submit" disabled={pending || signals.length === 0}>{pending ? "Generating with Gemini…" : "Generate Decision Brief"}</button>
    <div className={`form-status ${state.status}`} role="alert" aria-live="polite">{state.message}</div>
  </form>;
}
