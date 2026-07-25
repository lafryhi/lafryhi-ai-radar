import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validOperatorToken } from "@/auth/operator";
import { getRepository } from "@/persistence";
import { discoverRss } from "@/services/rss-discovery";
import type { RadarRepository } from "@/persistence/repository";

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

export async function POST(request: NextRequest) { return handleOperatorRssDiscovery(request, await getRepository()); }
