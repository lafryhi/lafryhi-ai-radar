import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "lafryhi-ai-radar",
    phase: 2,
    persistenceAdapter: process.env.PERSISTENCE_ADAPTER === "firestore" ? "firestore" : "local",
    aiAdapter: process.env.AI_ADAPTER === "vertex" ? "vertex" : "unconfigured",
  });
}
