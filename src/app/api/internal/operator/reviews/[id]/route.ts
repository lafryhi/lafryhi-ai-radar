import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validOperatorToken } from "@/auth/operator";
import { getRepository } from "@/persistence";
import { logOperatorEvent } from "@/services/operator-events";
import { reviewAnalysis, ReviewActionError } from "@/services/review";

const RequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(2000),
}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!validOperatorToken(request.headers.get("x-operator-token") || "")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { input = null; }
  const parsed = RequestSchema.safeParse(input);
  const { id } = await context.params;
  if (!parsed.success) {
    logOperatorEvent({ event: "operator.action_failed", analysisId: id || "missing", action: "approve", reason: "invalid_request" }, "warn");
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }
  try {
    const result = await reviewAnalysis(await getRepository(), id, parsed.data.status, parsed.data.note);
    return NextResponse.json({ status: result.decision.status, radarItemId: result.item?.id ?? null, idempotent: result.idempotent });
  } catch (error) {
    if (error instanceof ReviewActionError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    logOperatorEvent({ event: "operator.action_failed", analysisId: id, action: parsed.data.status === "approved" ? "approve" : "reject", reason: "persistence_failure" }, "warn");
    return NextResponse.json({ error: "Review operation failed." }, { status: 503 });
  }
}
