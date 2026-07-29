import { NextResponse } from "next/server";
import { healthPayload } from "@/services/operational-health";

export function GET() {
  return NextResponse.json(healthPayload());
}
