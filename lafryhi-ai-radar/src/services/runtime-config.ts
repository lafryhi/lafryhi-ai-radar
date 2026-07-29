import { z } from "zod";

const ProductionConfigSchema = z.object({
  NODE_ENV: z.literal("production"),
  DEPLOYMENT_ENV: z.literal("production"),
  PERSISTENCE_ADAPTER: z.literal("firestore"),
  AI_ADAPTER: z.literal("vertex"),
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GOOGLE_CLOUD_LOCATION: z.string().min(1).default("us-central1"),
  FIRESTORE_DATABASE_ID: z.string().min(1).default("(default)"),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  OPERATOR_ACCESS_TOKEN: z.string().min(20),
  RSS_SCHEDULER_JOB_NAME: z.string().min(1),
  RSS_SCHEDULER_SECRET: z.string().min(20),
  APP_BASE_URL: z.string().url().refine((value) => value.startsWith("https://"), "APP_BASE_URL must use HTTPS in production."),
}).passthrough();

const PaddleProductionSchema = z.object({
  BILLING_ENABLED: z.literal("true"),
  PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]),
  PADDLE_CLIENT_TOKEN: z.string().min(8),
  PADDLE_API_KEY: z.string().min(8),
  PADDLE_WEBHOOK_SECRET: z.string().min(8),
  PADDLE_PRO_PRICE_ID: z.string().startsWith("pri_"),
  PADDLE_DEFAULT_CHECKOUT_URL: z.string().url(),
}).passthrough();

export type PersistenceAdapter = "memory" | "local" | "firestore";

export function validateProductionEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const parsed = ProductionConfigSchema.safeParse(env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "runtime configuration")))];
    throw new Error(`Invalid production configuration: ${names.join(", ")}.`);
  }
  if (env.BILLING_ENABLED === "true") {
    const billing = PaddleProductionSchema.safeParse(env);
    if (!billing.success) {
      const names = [...new Set(billing.error.issues.map((issue) => String(issue.path[0] ?? "billing configuration")))];
      throw new Error(`Invalid production billing configuration: ${names.join(", ")}.`);
    }
  }
  return parsed.data;
}

export function billingConfigurationState(env: NodeJS.ProcessEnv = process.env): "configured" | "not_configured" | "degraded" {
  if (env.BILLING_ENABLED !== "true") return "not_configured";
  return PaddleProductionSchema.safeParse(env).success ? "configured" : "degraded";
}

export function resolvePersistenceAdapter(env: NodeJS.ProcessEnv = process.env): PersistenceAdapter {
  if (env.NODE_ENV === "test") return "memory";
  if (env.NODE_ENV === "production") {
    validateProductionEnvironment(env);
    return "firestore";
  }
  const adapter = env.PERSISTENCE_ADAPTER || "local";
  if (!["local", "memory", "firestore"].includes(adapter)) throw new Error("PERSISTENCE_ADAPTER must be local, memory, or firestore.");
  return adapter as PersistenceAdapter;
}
