import { NextRequest, NextResponse } from "next/server";
import { validOperatorToken } from "@/auth/operator";
import { handlePipelineRecovery } from "@/services/pipeline-recovery";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-operator-token") || "";
  if (!validOperatorToken(token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = await handlePipelineRecovery(body, {
    async rerun(sourceRecordId) {
      const [{ getRepository }, { getAnalyzer }, { rerunPipeline }] = await Promise.all([
        import("@/persistence"),
        import("@/services/ai"),
        import("@/services/pipeline"),
      ]);
      await rerunPipeline(sourceRecordId, await getRepository(), await getAnalyzer());
    },
    async reconcileStale() {
      const [{ getRepository }, { reconcileStaleProcessingRuns }] = await Promise.all([
        import("@/persistence"),
        import("@/services/analysis-finalization"),
      ]);
      await reconcileStaleProcessingRuns(await getRepository());
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ status: "ok", validation: result.kind });
}
