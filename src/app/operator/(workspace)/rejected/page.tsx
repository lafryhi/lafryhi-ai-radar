import { getRepository } from "@/persistence";
import { getReviewQueue } from "@/services/operator-dashboard";
import { ReviewQueue } from "@/components/operator/review-queue";
export const dynamic = "force-dynamic";
export default async function Rejected() { const entries = await getReviewQueue(await getRepository(), { status: "rejected" }); return <><p className="eyebrow">Preserved audit evidence</p><h1>Rejected analyses</h1><p className="lede">Rejected AI output remains traceable and can never enter the approved feed.</p><ReviewQueue entries={entries} empty="No analyses have been rejected." /></>; }
