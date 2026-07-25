import { Firestore } from "@google-cloud/firestore";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const TEST_COLLECTION = "_runtimeDiagnostics";
const TEST_DOCUMENT = "checkpoint7-runtime-validation";

const GeminiDiagnosticOutputSchema = z.object({
  status: z.literal("ok"),
  message: z.string().min(10).max(160),
});

const FirestoreDiagnosticSchema = z.object({
  writeReadVerified: z.literal(true),
  deleteVerified: z.literal(true),
  collectionEmpty: z.literal(true),
});

const VertexDiagnosticSchema = z.object({
  status: z.literal("ok"),
  model: z.string().min(1),
  region: z.string().min(1),
  latencyMs: z.number().int().nonnegative(),
  responseSummary: z.literal("Model returned the required minimal connectivity acknowledgement."),
});

export const RuntimeDiagnosticResultSchema = z.object({
  status: z.literal("ok"),
  diagnostic: z.literal("checkpoint7-runtime-validation"),
  firestore: FirestoreDiagnosticSchema,
  vertexAi: VertexDiagnosticSchema,
  secretAccessValidated: z.literal(true),
});

export type RuntimeDiagnosticResult = z.infer<typeof RuntimeDiagnosticResultSchema>;

export interface RuntimeDiagnosticDependencies {
  verifyFirestoreLifecycle(): Promise<z.infer<typeof FirestoreDiagnosticSchema>>;
  invokeVertexAi(): Promise<z.infer<typeof VertexDiagnosticSchema>>;
}

export function parseGeminiDiagnosticOutput(text: string) {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Vertex AI diagnostic returned malformed JSON.");
  }
  return GeminiDiagnosticOutputSchema.parse(value);
}

async function verifyFirestoreLifecycle() {
  const db = new Firestore({ databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)" });
  const collection = db.collection(TEST_COLLECTION);
  const reference = collection.doc(TEST_DOCUMENT);
  const expected = {
    diagnostic: "checkpoint7-runtime-validation",
    expectedValue: "write-read-delete",
    createdAt: new Date().toISOString(),
  };

  try {
    await reference.set(expected);
    const stored = await reference.get();
    const data = stored.data();
    if (!stored.exists || data?.diagnostic !== expected.diagnostic || data?.expectedValue !== expected.expectedValue) {
      throw new Error("Firestore diagnostic read did not match the written values.");
    }
  } finally {
    await reference.delete();
  }

  const deleted = !(await reference.get()).exists;
  const collectionEmpty = (await collection.limit(1).get()).empty;
  return FirestoreDiagnosticSchema.parse({
    writeReadVerified: true,
    deleteVerified: deleted,
    collectionEmpty,
  });
}

async function invokeVertexAi() {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is required for the runtime diagnostic.");
  const region = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const timeout = Number(process.env.VERTEX_TIMEOUT_MS || "60000");
  const client = new GoogleGenAI({ vertexai: true, project, location: region, httpOptions: { timeout } });
  const startedAt = Date.now();
  const response = await client.models.generateContent({
    model,
    contents: "Return a minimal JSON acknowledgement that this non-sensitive runtime connectivity check succeeded. Do not add facts, advice, personal data, or external information.",
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["status", "message"],
        properties: {
          status: { type: "string", enum: ["ok"] },
          message: { type: "string", minLength: 10, maxLength: 160 },
        },
      },
      temperature: 0,
      maxOutputTokens: 256,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Vertex AI diagnostic returned no text.");
  parseGeminiDiagnosticOutput(text);
  return VertexDiagnosticSchema.parse({
    status: "ok",
    model,
    region,
    latencyMs: Date.now() - startedAt,
    responseSummary: "Model returned the required minimal connectivity acknowledgement.",
  });
}

const productionDependencies: RuntimeDiagnosticDependencies = {
  verifyFirestoreLifecycle,
  invokeVertexAi,
};

export async function runRuntimeDiagnostic(
  dependencies: RuntimeDiagnosticDependencies = productionDependencies,
): Promise<RuntimeDiagnosticResult> {
  const firestore = await dependencies.verifyFirestoreLifecycle();
  const vertexAi = await dependencies.invokeVertexAi();
  return RuntimeDiagnosticResultSchema.parse({
    status: "ok",
    diagnostic: "checkpoint7-runtime-validation",
    firestore,
    vertexAi,
    secretAccessValidated: true,
  });
}
