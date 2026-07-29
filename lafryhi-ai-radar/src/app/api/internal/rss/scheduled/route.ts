import { NextRequest } from "next/server";
import { getRepository } from "@/persistence";
import { handleScheduledRssDiscovery } from "@/services/rss-route-handlers";

export async function POST(request: NextRequest) { return handleScheduledRssDiscovery(request, await getRepository()); }
