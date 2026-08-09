import { NextRequest } from "next/server";
import { getRepository } from "@/persistence";
import { handlePublishedRadarExport } from "@/services/published-radar-export-route";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: NextRequest) {
  return handlePublishedRadarExport(request, await getRepository());
}
