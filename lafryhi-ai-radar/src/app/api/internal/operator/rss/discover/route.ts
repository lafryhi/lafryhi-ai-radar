import { NextRequest } from "next/server";
import { getRepository } from "@/persistence";
import { handleOperatorRssDiscovery } from "@/services/rss-route-handlers";

export async function POST(request: NextRequest) { return handleOperatorRssDiscovery(request, await getRepository()); }
