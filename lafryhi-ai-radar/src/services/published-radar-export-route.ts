import { NextRequest, NextResponse } from "next/server";
import type { RadarRepository } from "@/persistence/repository";
import {
  GoogleRadarExportIdentityVerifier,
  PublishedRadarExportQuerySchema,
  exportPublishedRadarItems,
  type RadarExportIdentityVerifier,
} from "./published-radar-export";

export async function handlePublishedRadarExport(
  request: NextRequest,
  repository: RadarRepository,
  identity: RadarExportIdentityVerifier = new GoogleRadarExportIdentityVerifier(),
) {
  if (!(await identity.verify(request.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = request.nextUrl;
  const keys = [...url.searchParams.keys()];
  if (
    keys.some(
      (key) =>
        !["topic", "maximumItemCount", "language", "freshnessHours"].includes(
          key,
        ),
    )
  ) {
    return NextResponse.json(
      { error: "Invalid export query." },
      { status: 400 },
    );
  }
  const parsed = PublishedRadarExportQuerySchema.safeParse({
    topic: url.searchParams.get("topic") ?? undefined,
    maximumItemCount: url.searchParams.get("maximumItemCount") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
    freshnessHours: url.searchParams.get("freshnessHours") ?? undefined,
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid export query." },
      { status: 400 },
    );
  try {
    const response = await Promise.race([
      exportPublishedRadarItems(repository, parsed.data),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("export timeout")), 8_000),
      ),
    ]);
    return NextResponse.json(response, {
      headers: {
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Export unavailable." }, { status: 503 });
  }
}
