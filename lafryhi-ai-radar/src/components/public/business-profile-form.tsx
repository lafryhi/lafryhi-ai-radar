"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { BusinessProfile } from "@/domain/public-mvp";
import { saveBusinessProfileAction, type PublicActionState } from "@/app/public-actions";

const initialState: PublicActionState = { status: "idle", message: "" };

export function BusinessProfileForm({ profile, createNew = false }: { profile: BusinessProfile | null; createNew?: boolean }) {
  const [state, action, pending] = useActionState(saveBusinessProfileAction, initialState);
  return <form action={action} className="public-form" onSubmit={(event) => {
    const goals = [...event.currentTarget.querySelectorAll<HTMLInputElement>('input[name="businessGoals"]')];
    const first = goals[0];
    if (!goals.some((input) => input.checked)) {
      event.preventDefault();
      first?.setCustomValidity("Select at least one primary business goal.");
      first?.reportValidity();
    } else {
      first?.setCustomValidity("");
    }
  }}>
    {profile && <input type="hidden" name="profileId" value={profile.id} />}
    {createNew && <input type="hidden" name="createNew" value="true" />}
    <div className="field-grid">
      <label>Business Name<input name="businessName" required minLength={2} maxLength={160} defaultValue={profile?.businessName} autoComplete="organization" /></label>
      <label>Industry<input name="industry" required maxLength={160} defaultValue={profile?.industry} placeholder="e.g. Education technology" /></label>
      <label>Company Size<select name="companySize" required defaultValue={profile?.companySize ?? ""}><option value="" disabled>Select size</option><option value="SOLO">Solo</option><option value="MICRO">Micro (2–9)</option><option value="SMALL">Small (10–49)</option><option value="MEDIUM">Medium (50–249)</option></select></label>
      <label>AI Maturity<select name="aiMaturity" required defaultValue={profile?.aiMaturity ?? ""}><option value="" disabled>Select maturity</option><option value="NONE">None</option><option value="EXPLORING">Exploring</option><option value="PILOTING">Piloting</option><option value="OPERATIONAL">Operational</option><option value="ADVANCED">Advanced</option></select></label>
      <label>Budget Range<select name="budgetRange" required defaultValue={profile?.budgetRange ?? ""}><option value="" disabled>Select budget</option><option value="NO_BUDGET">No current budget</option><option value="UNDER_1K">Under $1,000</option><option value="1K_TO_10K">$1,000–$10,000</option><option value="10K_TO_50K">$10,000–$50,000</option><option value="OVER_50K">Over $50,000</option><option value="UNKNOWN">Not decided</option></select></label>
      <label>Risk Tolerance<select name="riskTolerance" required defaultValue={profile?.riskTolerance ?? ""}><option value="" disabled>Select tolerance</option><option value="LOW">Low</option><option value="MODERATE">Moderate</option><option value="HIGH">High</option></select></label>
    </div>
    <fieldset><legend>Primary Business Goals</legend><p className="field-help">Select at least one.</p>
      {["Reduce costs", "Increase revenue", "Improve customer experience", "Automate operations", "Develop new products"].map((goal) =>
        <label className="check-label" key={goal}><input type="checkbox" name="businessGoals" value={goal} defaultChecked={profile?.businessGoals.includes(goal)} onChange={(event) => {
          const form = event.currentTarget.form;
          form?.querySelector<HTMLInputElement>('input[name="businessGoals"]')?.setCustomValidity("");
        }} />{goal}</label>)}
    </fieldset>
    <fieldset><legend>Current Tools</legend><p className="field-help">Select all that apply.</p>
      {["Google Workspace", "Microsoft 365", "CRM", "Help desk", "E-commerce platform", "No dedicated tools"].map((tool) =>
        <label className="check-label" key={tool}><input type="checkbox" name="currentTools" value={tool} defaultChecked={profile?.currentTools.includes(tool)} />{tool}</label>)}
    </fieldset>
    <button className="button-link" type="submit" disabled={pending}>{pending ? "Saving Profile…" : "Save Business Profile"}</button>
    <div className={`form-status ${state.status}`} role="status" aria-live="polite">{state.message}</div>
    {state.status === "success" && <Link className="text-link" href={`/decisions/new?profileId=${encodeURIComponent(state.resourceId ?? profile?.id ?? "")}`}>Choose a Trusted Signal →</Link>}
  </form>;
}
