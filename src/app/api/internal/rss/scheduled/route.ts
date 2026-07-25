import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/persistence";
import { discoverRss } from "@/services/rss-discovery";
import { logRssEvent } from "@/services/rss-events";
import type { RadarRepository } from "@/persistence/repository";

export async function handleScheduledRssDiscovery(request: NextRequest, repository: RadarRepository) {
  const scheduler = request.headers.get("x-cloudscheduler") === "true";
  const jobName = request.headers.get("x-cloudscheduler-jobname") || "";
  const expected = process.env.RSS_SCHEDULER_JOB_NAME || "lafryhi-ai-radar-rss-discovery";
  if (!scheduler || !jobName.endsWith(`/jobs/${expected}`)) {
    logRssEvent({ event: "rss.schedule_unauthorized", reason: "unauthorized" }, "warn");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const run = await discoverRss(repository, "scheduled");
  return NextResponse.json({ runId: run.id, status: run.status, sourcesConsidered: run.sourcesConsidered, candidatesAccepted: run.candidatesAccepted, duplicates: run.duplicates, skippedItems: run.skippedItems });
}

export async function POST(request: NextRequest) { return handleScheduledRssDiscovery(request, await getRepository()); }
