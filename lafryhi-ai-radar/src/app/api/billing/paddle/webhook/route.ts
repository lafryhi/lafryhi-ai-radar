import { NextResponse } from "next/server";
import { getRepository } from "@/persistence";
import { BillingError, processPaddleWebhook } from "@/services/billing";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const result = await processPaddleWebhook(await getRepository(), rawBody, request.headers.get("paddle-signature") ?? "");
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    const status = error instanceof BillingError && error.code === "FORBIDDEN" ? 401 : error instanceof SyntaxError ? 400 : 500;
    console.error(JSON.stringify({ event: "paddle_webhook_failed", category: error instanceof BillingError ? error.code : "PROCESSING_ERROR" }));
    return NextResponse.json({ error: status === 401 ? "Invalid signature." : "Webhook processing failed." }, { status });
  }
}
