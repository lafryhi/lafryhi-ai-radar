import { NextRequest, NextResponse } from "next/server";
import { validOperatorToken } from "@/auth/operator";
import { runRuntimeDiagnostic } from "@/services/runtime-diagnostics";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-operator-token") || "";
  if (!validOperatorToken(token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const result = await runRuntimeDiagnostic();
    console.info(JSON.stringify({
      event: "runtime_diagnostic_completed",
      diagnostic: result.diagnostic,
      status: result.status,
      firestoreWriteRead: result.firestore.writeReadVerified,
      firestoreDeleted: result.firestore.deleteVerified,
      firestoreCollectionEmpty: result.firestore.collectionEmpty,
      vertexStatus: result.vertexAi.status,
      vertexModel: result.vertexAi.model,
      vertexRegion: result.vertexAi.region,
      vertexLatencyMs: result.vertexAi.latencyMs,
      secretAccessValidated: result.secretAccessValidated,
      totalLatencyMs: Date.now() - startedAt,
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error(JSON.stringify({
      event: "runtime_diagnostic_failed",
      status: "error",
      errorType: error instanceof Error ? error.name : "UnknownError",
      totalLatencyMs: Date.now() - startedAt,
    }));
    return NextResponse.json({ error: "Runtime diagnostic failed." }, { status: 500 });
  }
}
