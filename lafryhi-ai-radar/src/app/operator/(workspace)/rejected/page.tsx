import { getRepository } from "@/persistence";
import { getReviewQueue } from "@/services/operator-dashboard";
import { ReviewQueue } from "@/components/operator/review-queue";
export const dynamic = "force-dynamic";
export default async function Rejected() { const entries = await getReviewQueue(await getRepository(), { status: "rejected" }); return <><p className="eyebrow">Preserved verification evidence</p><h1>Rejected Intelligence</h1><p className="lede">Rejected Gemini output remains traceable and can never become a Decision Brief.</p><ReviewQueue entries={entries} empty="No Gemini Analyses have been rejected." /></>; }
