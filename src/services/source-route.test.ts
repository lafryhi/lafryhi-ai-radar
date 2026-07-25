import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/internal/operator/sources/process/route";

const token = "phase-five-route-operator-token";

describe("protected source processing route", () => {
  afterEach(() => { vi.restoreAllMocks(); delete process.env.OPERATOR_ACCESS_TOKEN; });

  it("rejects unauthorized source intake", async () => {
    process.env.OPERATOR_ACCESS_TOKEN = token;
    const response = await POST(new NextRequest("https://example.test/api/internal/operator/sources/process", { method: "POST", body: JSON.stringify({ url: "https://cloud.google.com/blog/test" }) }));
    expect(response.status).toBe(401);
  });

  it("returns HTTP 400 for malformed authorized requests", async () => {
    process.env.OPERATOR_ACCESS_TOKEN = token;
    const response = await POST(new NextRequest("https://example.test/api/internal/operator/sources/process", { method: "POST", headers: { "content-type": "application/json", "x-operator-token": token }, body: JSON.stringify({ url: "not-a-url" }) }));
    expect(response.status).toBe(400);
  });
});
