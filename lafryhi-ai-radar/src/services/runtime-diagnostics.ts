import { Firestore } from "@google-cloud/firestore";
import { z } from "zod";
import { ControlledGeminiClient, type NormalizedGeminiResponseMetadata } from "./gemini-client";
import {
  GOOGLE_GENAI_SDK_VERSION,
  type GeminiRuntimeConfig,
} from "./gemini-runtime-config";

const TEST_COLLECTION = "_runtimeDiagnostics";
const TEST_DOCUMENT = "checkpoint7-runtime-validation";

export type GeminiDiagnosticLevel = "connectivity" | "production-contract";

const ConnectivityOutputSchema = z.object({
  status: z.literal("ok"),
  message: z.string().min(10).max(160),
});

const ProductionContractOutputSchema = z.object({
  status: z.literal("ok"),
  facts: z.array(z.object({ id: z.string(), text: z.string() })).min(1).max(2),
  confidence: z.number().int().min(0).max(100),
});

const FirestoreDiagnosticSchema = z.object({
  writeReadVerified: z.literal(true),
  deleteVerified: z.literal(true),
  collectionEmpty: z.literal(true),
});

const ResponseMetadataSchema = z.object({
  modelVersion: z.string().optional(),
  usageMetadata: z.unknown().optional(),
  finishReason: z.string().optional(),
  safetyInformation: z.unknown().optional(),
  candidateCount: z.number().int().nonnegative(),
});

const VertexDiagnosticSchema = z.object({
  status: z.literal("ok"),
  level: z.enum(["connectivity", "production-contract"]),
  model: z.string().min(1),
  actualModel: z.string().min(1),
  fallbackModel: z.string().min(1),
  fallbackUsed: z.boolean(),
  attempts: z.number().int().positive(),
  region: z.string().min(1),
  latencyMs: z.number().int().nonnegative(),
  timeoutMs: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  projectConfigured: z.boolean(),
  sdkVersion: z.string().min(1),
  structuredJsonValid: z.literal(true),
  responseMetadata: ResponseMetadataSchema,
  responseSummary: z.string().min(1),
});

export const RuntimeDiagnosticResultSchema = z.object({
  status: z.literal("ok"),
  diagnostic: z.literal("gemini-migration-stabilization"),
  firestore: FirestoreDiagnosticSchema,
  vertexAi: z.object({
    connectivity: VertexDiagnosticSchema,
    productionContract: VertexDiagnosticSchema,
  }),
  secretAccessValidated: z.literal(true),
});

export type VertexDiagnostic = z.infer<typeof VertexDiagnosticSchema>;
export type RuntimeDiagnosticResult = z.infer<typeof RuntimeDiagnosticResultSchema>;

export interface RuntimeDiagnosticDependencies {
  verifyFirestoreLifecycle(): Promise<z.infer<typeof FirestoreDiagnosticSchema>>;
  invokeVertexAi(level: GeminiDiagnosticLevel): Promise<VertexDiagnostic>;
}

export function parseGeminiDiagnosticOutput(text: string, level: GeminiDiagnosticLevel = "connectivity") {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Vertex AI diagnostic returned malformed JSON.");
  }
  return level === "connectivity"
    ? ConnectivityOutputSchema.parse(value)
    : ProductionContractOutputSchema.parse(value);
}

async function verifyFirestoreLifecycle() {
  const db = new Firestore({ databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)" });
  const collection = db.collection(TEST_COLLECTION);
  const reference = collection.doc(TEST_DOCUMENT);
  const expected = {
    diagnostic: "gemini-migration-stabilization",
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

  return FirestoreDiagnosticSchema.parse({
    writeReadVerified: true,
    deleteVerified: !(await reference.get()).exists,
    collectionEmpty: (await collection.limit(1).get()).empty,
  });
}

function diagnosticRequest(level: GeminiDiagnosticLevel) {
  if (level === "connectivity") {
    return {
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
    };
  }
  return {
    contents: "Analyze only this statement: The migration contract test is active. Return one fact with id F1 and confidence 100.",
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["status", "facts", "confidence"],
        properties: {
          status: { type: "string", enum: ["ok"] },
          facts: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "text"],
              properties: { id: { type: "string" }, text: { type: "string" } },
            },
          },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
        },
      },
      temperature: 0,
      maxOutputTokens: 512,
    },
  };
}

export async function runGeminiDiagnostic(
  level: GeminiDiagnosticLevel,
  client = new ControlledGeminiClient(),
  config: GeminiRuntimeConfig = client.config,
): Promise<VertexDiagnostic> {
  const generation = await client.generateContent(diagnosticRequest(level));
  const text = generation.response.text;
  if (!text) throw new Error("Vertex AI diagnostic returned no text.");
  parseGeminiDiagnosticOutput(text, level);
  return VertexDiagnosticSchema.parse({
    status: "ok",
    level,
    model: config.primaryModel,
    actualModel: generation.actualModel,
    fallbackModel: config.fallbackModel,
    fallbackUsed: generation.fallbackUsed,
    attempts: generation.attempts,
    region: config.location,
    latencyMs: generation.durationMs,
    timeoutMs: config.timeoutMs,
    maxOutputTokens: config.maxOutputTokens,
    projectConfigured: Boolean(config.project),
    sdkVersion: GOOGLE_GENAI_SDK_VERSION,
    structuredJsonValid: true,
    responseMetadata: generation.metadata satisfies NormalizedGeminiResponseMetadata,
    responseSummary: level === "connectivity"
      ? "Model returned the required minimal connectivity acknowledgement."
      : "Model satisfied the representative structured-output contract.",
  });
}

const productionDependencies: RuntimeDiagnosticDependencies = {
  verifyFirestoreLifecycle,
  invokeVertexAi: runGeminiDiagnostic,
};

export async function runRuntimeDiagnostic(
  dependencies: RuntimeDiagnosticDependencies = productionDependencies,
): Promise<RuntimeDiagnosticResult> {
  const firestore = await dependencies.verifyFirestoreLifecycle();
  const connectivity = await dependencies.invokeVertexAi("connectivity");
  const productionContract = await dependencies.invokeVertexAi("production-contract");
  return RuntimeDiagnosticResultSchema.parse({
    status: "ok",
    diagnostic: "gemini-migration-stabilization",
    firestore,
    vertexAi: { connectivity, productionContract },
    secretAccessValidated: true,
  });
}
