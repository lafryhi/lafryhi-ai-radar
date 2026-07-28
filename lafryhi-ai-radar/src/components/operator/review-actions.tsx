"use client";

import { useState } from "react";
import { decide } from "@/app/operator/actions";

export function ReviewActions({ analysisId }: { analysisId: string }) {
  const [submitting, setSubmitting] = useState(false);
  return <div className="decision-actions">
    <form action={decide} onSubmit={(event) => {
      if (!window.confirm("Verify this Gemini Analysis and publish one Decision Brief?")) event.preventDefault();
      else setSubmitting(true);
    }}>
      <input type="hidden" name="analysisId" value={analysisId} />
      <input type="hidden" name="status" value="approved" />
      <label>Optional verification note<textarea name="note" maxLength={2000} /></label>
      <button disabled={submitting}>{submitting ? "Submitting…" : "Verify and publish brief"}</button>
    </form>
    <form action={decide} onSubmit={(event) => {
      if (!window.confirm("Reject this Gemini Analysis? It will remain as audit evidence and will not become a Decision Brief.")) event.preventDefault();
      else setSubmitting(true);
    }}>
      <input type="hidden" name="analysisId" value={analysisId} />
      <input type="hidden" name="status" value="rejected" />
      <label>Rejection reason<textarea name="note" minLength={5} maxLength={2000} required /></label>
      <button className="danger" disabled={submitting}>{submitting ? "Submitting…" : "Reject intelligence"}</button>
    </form>
  </div>;
}
