import Link from "next/link";
import { getAnonymousSessionId } from "@/auth/anonymous-session";
import { BusinessProfileForm } from "@/components/public/business-profile-form";
import { getRepository } from "@/persistence";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Business Profile | LAFRYHI AI Radar" };

export default async function BusinessProfilePage({ searchParams }: { searchParams: Promise<{ id?: string; new?: string }> }) {
  const ownerId = await getAnonymousSessionId();
  const params = await searchParams;
  const repository = await getRepository();
  const profiles = ownerId ? await repository.listBusinessProfilesByOwner(ownerId) : [];
  const createNew = params.new === "1";
  const profile = createNew ? null : profiles.find((candidate) => candidate.id === params.id) ?? profiles[0] ?? null;
  return <section className="public-shell narrow-shell">
    <p className="eyebrow">Business Context</p>
    <h1>{profile ? "Update My Business Profile" : "Create Your Business Profile"}</h1>
    <p className="section-copy">Gemini uses this validated context only when generating your personalized Decision Brief. It is saved to your anonymous browser session.</p>
    {profiles.length > 0 && <nav className="profile-switcher" aria-label="Business Profiles">
      {profiles.map((candidate) => <Link className={candidate.id === profile?.id ? "active" : ""} href={`/business-profile?id=${candidate.id}`} key={candidate.id}>{candidate.businessName}</Link>)}
      <Link href="/business-profile?new=1">Create another</Link>
    </nav>}
    <BusinessProfileForm profile={profile} createNew={createNew} />
  </section>;
}
