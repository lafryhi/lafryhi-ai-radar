import { NextRequest, NextResponse } from "next/server";
import { MissionControlRequestSchema } from "@/domain/mission-control";
import { validOperatorToken } from "@/auth/operator";
import { isDemoModeEnabled } from "@/services/mission-control-demo";
import { MissionControlConflictError, MissionControlInputError, runMissionControl } from "@/services/mission-control-pipeline";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("lafryhi_operator")?.value;
  if (!token || !validOperatorToken(token)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = MissionControlRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid Mission Control request." }, { status: 400 });
  if (parsed.data.mode === "demo" && !isDemoModeEnabled()) return NextResponse.json({ error: "Demo mode is disabled." }, { status: 400 });
  try { return NextResponse.json(await runMissionControl(parsed.data)); }
  catch (error) {
    if (error instanceof MissionControlConflictError) return NextResponse.json({ error: "A Mission Control run is already active." }, { status: 409 });
    if (error instanceof MissionControlInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Mission Control could not complete safely." }, { status: 503 });
  }
}
