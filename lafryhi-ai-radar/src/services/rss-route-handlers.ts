import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validOperatorToken } from "@/auth/operator";
import type { RadarRepository } from "@/persistence/repository";
import { discoverRss } from "./rss-discovery";
import { logRssEvent } from "./rss-events";
import { createHash, timingSafeEqual } from "node:crypto";

const RequestSchema = z.object({ sourceDefinitionId: z.string().min(1) }).strict();

export async function handleOperatorRssDiscovery(request: NextRequest, repository: RadarRepository) {
  if (!validOperatorToken(request.headers.get("x-operator-token") || "")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid discovery request." }, { status: 400 });
  const run = await discoverRss(repository, "manual", parsed.data.sourceDefinitionId);
  return NextResponse.json({ runId: run.id, status: run.status, itemsExamined: run.itemsExamined, candidatesAccepted: run.candidatesAccepted, duplicates: run.duplicates, skippedItems: run.skippedItems, validationFailures: run.validationFailures });
}

export async function handleScheduledRssDiscovery(request: NextRequest, repository: RadarRepository) {
  const scheduler = request.headers.get("x-cloudscheduler") === "true";
  const jobName = request.headers.get("x-cloudscheduler-jobname") || "";
  const expected = process.env.RSS_SCHEDULER_JOB_NAME || "lafryhi-ai-radar-rss-discovery";
  const expectedSecret = process.env.RSS_SCHEDULER_SECRET || "";
  const candidateSecret = request.headers.get("x-internal-scheduler-secret") || "";
  const secretValid = expectedSecret.length >= 20 && timingSafeEqual(
    createHash("sha256").update(candidateSecret).digest(),
    createHash("sha256").update(expectedSecret).digest(),
  );
  if (!scheduler || !jobName.endsWith(`/jobs/${expected}`) || !secretValid) {
    logRssEvent({ event: "rss.schedule_unauthorized", reason: "unauthorized" }, "warn");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const run = await discoverRss(repository, "scheduled");
  return NextResponse.json({ runId: run.id, status: run.status, sourcesConsidered: run.sourcesConsidered, candidatesAccepted: run.candidatesAccepted, duplicates: run.duplicates, skippedItems: run.skippedItems });
}
