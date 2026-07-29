import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validOperatorToken } from "@/auth/operator";
import { getRepository } from "@/persistence";
import { getAnalyzer } from "@/services/ai";
import { IngestionError, validateRegisteredSource, validateSourceUrl } from "@/services/ingestion";
import { runPipeline } from "@/services/pipeline";

const RequestSchema = z.object({ url: z.string().url() }).strict();

export async function POST(request: NextRequest) {
  if (!validOperatorToken(request.headers.get("x-operator-token") || "")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid source request." }, { status: 400 });
  const repository = await getRepository();
  try {
    await validateRegisteredSource(validateSourceUrl(parsed.data.url), repository);
    const result = await runPipeline(parsed.data.url, repository, await getAnalyzer());
    return NextResponse.json({ sourceRecordId: result.source.id, processingRunId: result.run.id, reviewStatus: "pending" }, { status: 201 });
  } catch (error) {
    if (error instanceof IngestionError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Source processing failed." }, { status: 503 });
  }
}
