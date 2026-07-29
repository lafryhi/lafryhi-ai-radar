import { Firestore } from "@google-cloud/firestore";
import { validateProductionEnvironment } from "./runtime-config";

export function healthPayload(now = new Date(), version = process.env.K_REVISION || process.env.npm_package_version || "unknown") {
  return { status: "ok" as const, service: "lafryhi-ai-radar", version, timestamp: now.toISOString() };
}

export interface ReadinessDependencies {
  checkFirestore(): Promise<void>;
}

const productionDependencies: ReadinessDependencies = {
  async checkFirestore() {
    const db = new Firestore({ databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)" });
    await db.collection("_operational").doc("readiness").get();
  },
};

export async function readinessPayload(
  dependencies: ReadinessDependencies = productionDependencies,
  env: NodeJS.ProcessEnv = process.env,
  now = new Date(),
) {
  try {
    validateProductionEnvironment(env);
    await dependencies.checkFirestore();
    return { statusCode: 200, body: { status: "ready" as const, service: "lafryhi-ai-radar", checks: { configuration: "ok", firestore: "ok", vertexAi: "configured" }, timestamp: now.toISOString() } };
  } catch {
    return { statusCode: 503, body: { status: "degraded" as const, service: "lafryhi-ai-radar", checks: { configuration: "unavailable", firestore: "unavailable", vertexAi: "unavailable" }, timestamp: now.toISOString() } };
  }
}
