import { getRepository } from "@/persistence";
import { getReviewQueue } from "@/services/operator-dashboard";
import { ReviewQueue } from "@/components/operator/review-queue";
export const dynamic = "force-dynamic";
export default async function Published() { const entries = await getReviewQueue(await getRepository(), { status: "published" }); return <><p className="eyebrow">Verified decision intelligence</p><h1>Decision Briefs</h1><p className="lede">Only Gemini Analyses that completed explicit Human Verification are listed here.</p><ReviewQueue entries={entries} empty="No Decision Briefs are available." /></>; }
