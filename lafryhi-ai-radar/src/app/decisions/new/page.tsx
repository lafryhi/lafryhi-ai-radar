import Link from "next/link";
import { getAnonymousSessionId } from "@/auth/anonymous-session";
import { SignalSelectionForm } from "@/components/public/signal-selection-form";
import { getRepository } from "@/persistence";
import { listPublicSignals } from "@/services/public-mvp";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Decision Brief | LAFRYHI AI Radar" };

export default async function NewDecisionPage({ searchParams }: { searchParams: Promise<{ profileId?: string }> }) {
  const ownerId = await getAnonymousSessionId();
  const params = await searchParams;
  const repository = await getRepository();
  const profiles = ownerId ? await repository.listBusinessProfilesByOwner(ownerId) : [];
  const profile = profiles.find((candidate) => candidate.id === params.profileId) ?? profiles[0] ?? null;
  if (!profile) return <section className="public-shell narrow-shell"><p className="eyebrow">Business Context Required</p><h1>Create your Business Profile first.</h1><p>Gemini will not generate a contextual recommendation without validated Business Context.</p><Link className="button-link" href="/business-profile">Create Your Business Profile</Link></section>;
  const signals = await listPublicSignals(repository);
  return <section className="public-shell">
    <p className="eyebrow">Trusted Signal Selection</p>
    <h1>What should Gemini evaluate for {profile.businessName}?</h1>
    <p className="section-copy">Only human-verified, published signals appear here. Pending and rejected material remains private.</p>
    {profiles.length > 1 && <nav className="profile-switcher" aria-label="Choose Business Profile">
      {profiles.map((candidate) => <Link className={candidate.id === profile.id ? "active" : ""} href={`/decisions/new?profileId=${candidate.id}`} key={candidate.id}>{candidate.businessName}</Link>)}
    </nav>}
    {signals.length === 0
      ? <div className="panel empty-state"><h2>No verified signals are available</h2><p>Decision generation stays unavailable until the operator publishes a fully verified signal.</p></div>
      : <SignalSelectionForm signals={signals} businessProfileId={profile.id} />}
  </section>;
}
