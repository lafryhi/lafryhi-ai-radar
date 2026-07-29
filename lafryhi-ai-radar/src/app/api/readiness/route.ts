import { NextResponse } from "next/server";
import { readinessPayload } from "@/services/operational-health";

export async function GET() {
  const result = await readinessPayload();
  return NextResponse.json(result.body, { status: result.statusCode });
}
