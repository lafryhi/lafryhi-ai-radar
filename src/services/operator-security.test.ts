import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { validOperatorToken } from "@/auth/operator";
import { POST } from "@/app/api/internal/operator/reviews/[id]/route";
import { logOperatorEvent } from "./operator-events";

const token = "phase-4-deterministic-operator-token";

describe("operator authorization and safe failures", () => {
  afterEach(() => { vi.restoreAllMocks(); delete process.env.OPERATOR_ACCESS_TOKEN; });

  it("rejects unauthorized access and accepts the configured token server-side", async () => {
    process.env.OPERATOR_ACCESS_TOKEN = token;
    expect(validOperatorToken(token)).toBe(true);
    const response = await POST(new NextRequest("https://example.test/api/internal/operator/reviews/test", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "test" }) });
    expect(response.status).toBe(401);
  });

  it("returns 400 for malformed authorized input instead of 500", async () => {
    process.env.OPERATOR_ACCESS_TOKEN = token;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await POST(new NextRequest("https://example.test/api/internal/operator/reviews/test", {
      method: "POST",
      headers: { "content-type": "application/json", "x-operator-token": token },
      body: JSON.stringify({ status: "automatic", note: "", authorization: token }),
    }), { params: Promise.resolve({ id: "test" }) });
    expect(response.status).toBe(400);
  });

  it("never emits secret-bearing fields in operator structured logs", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logOperatorEvent({ event: "operator.dashboard_viewed", action: "view_dashboard" });
    const serialized = String(info.mock.calls[0][0]);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toMatch(/operatorToken|authorization|credential|secret|rawPrompt|normalizedText/i);
  });
});
