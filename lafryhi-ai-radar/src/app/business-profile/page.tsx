import { getAnonymousSessionId } from "@/auth/anonymous-session";
import { BusinessProfileForm } from "@/components/public/business-profile-form";
import { getRepository } from "@/persistence";
import { getOwnedBusinessProfile } from "@/services/public-mvp";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Business Profile | LAFRYHI AI Radar" };

export default async function BusinessProfilePage() {
  const ownerId = await getAnonymousSessionId();
  const profile = ownerId ? await getOwnedBusinessProfile(await getRepository(), ownerId) : null;
  return <section className="public-shell narrow-shell">
    <p className="eyebrow">Business Context</p>
    <h1>{profile ? "Update My Business Profile" : "Create Your Business Profile"}</h1>
    <p className="section-copy">Gemini uses this validated context only when generating your personalized Decision Brief. It is saved to your anonymous browser session.</p>
    <BusinessProfileForm profile={profile} />
  </section>;
}
