import { describe, expect, it } from "vitest";
import { anonymousSessionCookieOptions, isValidAnonymousSessionId } from "@/auth/session-policy";
import { healthPayload, readinessPayload } from "./operational-health";
import { resolvePersistenceAdapter, validateProductionEnvironment } from "./runtime-config";
import * as operatorRssRoute from "@/app/api/internal/operator/rss/discover/route";
import * as scheduledRssRoute from "@/app/api/internal/rss/scheduled/route";

const production = {
  NODE_ENV: "production",
  DEPLOYMENT_ENV: "production",
  PERSISTENCE_ADAPTER: "firestore",
  AI_ADAPTER: "vertex",
  GOOGLE_CLOUD_PROJECT: "test-project",
  GOOGLE_CLOUD_LOCATION: "us-central1",
  FIRESTORE_DATABASE_ID: "(default)",
  GEMINI_MODEL: "gemini-2.5-flash",
  OPERATOR_ACCESS_TOKEN: "a-production-secret-that-is-never-printed",
  RSS_SCHEDULER_JOB_NAME: "lafryhi-ai-radar-rss-discovery",
  RSS_SCHEDULER_SECRET: "a-production-scheduler-secret",
  APP_BASE_URL: "https://example.test",
} as NodeJS.ProcessEnv;

describe("production environment and persistence selection", () => {
  it("validates production without returning or printing secret values", () => {
    expect(validateProductionEnvironment(production)).toMatchObject({ PERSISTENCE_ADAPTER: "firestore", AI_ADAPTER: "vertex" });
    const secret = production.OPERATOR_ACCESS_TOKEN!;
    expect(() => validateProductionEnvironment({ ...production, OPERATOR_ACCESS_TOKEN: "" })).toThrow("OPERATOR_ACCESS_TOKEN");
    try { validateProductionEnvironment({ ...production, OPERATOR_ACCESS_TOKEN: secret, APP_BASE_URL: "http://insecure.test" }); } catch (error) {
      expect(String(error)).not.toContain(secret);
      expect(String(error)).toContain("APP_BASE_URL");
    }
  });

  it("selects memory for tests, local for development, and only Firestore for production", () => {
    expect(resolvePersistenceAdapter({ NODE_ENV: "test", PERSISTENCE_ADAPTER: "firestore" })).toBe("memory");
    expect(resolvePersistenceAdapter({ NODE_ENV: "development" })).toBe("local");
    expect(resolvePersistenceAdapter(production)).toBe("firestore");
    expect(() => resolvePersistenceAdapter({ NODE_ENV: "production" })).toThrow("Invalid production configuration");
  });
});

describe("anonymous session production policy", () => {
  it("uses hardened production cookies and validates UUID v4 values", () => {
    expect(anonymousSessionCookieOptions("production")).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 31_536_000 });
    expect(anonymousSessionCookieOptions("development").secure).toBe(false);
    expect(isValidAnonymousSessionId("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isValidAnonymousSessionId("forged-session-value")).toBe(false);
  });
});

describe("health and readiness", () => {
  it("returns safe process health without calling external dependencies", () => {
    expect(healthPayload(new Date("2026-07-29T12:00:00.000Z"), "revision-1")).toEqual({ status: "ok", service: "lafryhi-ai-radar", version: "revision-1", timestamp: "2026-07-29T12:00:00.000Z" });
  });

  it("reports ready or degraded without exposing secrets or internal errors", async () => {
    const ready = await readinessPayload({ async checkFirestore() {} }, production);
    expect(ready).toMatchObject({ statusCode: 200, body: { status: "ready", checks: { firestore: "ok", vertexAi: "configured" } } });
    const degraded = await readinessPayload({ async checkFirestore() { throw new Error(`database failed ${production.OPERATOR_ACCESS_TOKEN}`); } }, production);
    expect(degraded.statusCode).toBe(503);
    expect(JSON.stringify(degraded)).not.toContain(production.OPERATOR_ACCESS_TOKEN);
    expect(JSON.stringify(degraded)).not.toContain("database failed");
  });
});

describe("Next route export compliance", () => {
  it("keeps RSS route modules limited to supported route exports", () => {
    expect(Object.keys(operatorRssRoute)).toEqual(["POST"]);
    expect(Object.keys(scheduledRssRoute)).toEqual(["POST"]);
  });
});
