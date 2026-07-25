import { getRepository } from "@/persistence";
import { getReviewQueue } from "@/services/operator-dashboard";
import { ReviewQueue } from "@/components/operator/review-queue";
export const dynamic = "force-dynamic";
export default async function Published() { const entries = await getReviewQueue(await getRepository(), { status: "published" }); return <><p className="eyebrow">Publication evidence</p><h1>Published Radar items</h1><p className="lede">Only explicitly approved analyses are listed here.</p><ReviewQueue entries={entries} empty="No Radar items are published." /></>; }
