import { describe, expect, it, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/operator/(workspace)/mission-control/run/route";

const token = "operator-token-for-mission-control";
const validBody = { mode: "demo", period: { start: "2026-01-01T00:00:00.000Z", end: "2026-01-07T00:00:00.000Z" } };

function request(body: unknown, authenticated = true) {
  const headers = new Headers({ "content-type": "application/json" });
  const result = new NextRequest("http://localhost/operator/mission-control/run", { method: "POST", headers, body: JSON.stringify(body) });
  if (authenticated) result.cookies.set("lafryhi_operator", token);
  return result;
}

describe("Mission Control execution route", () => {
  beforeEach(() => { process.env.OPERATOR_ACCESS_TOKEN = token; process.env.AI_RADAR_DEMO_MODE = "true"; });
  it("returns 403 without the operator cookie", async () => { expect((await POST(request(validBody, false))).status).toBe(403); });
  it("returns 400 for an invalid request", async () => { expect((await POST(request({ mode: "demo" }))).status).toBe(400); });
  it("returns a complete protected demo execution", async () => { const response = await POST(request(validBody)); expect(response.status).toBe(200); const body = await response.json(); expect(body.stages).toHaveLength(7); expect(body.mode).toBe("demo"); });
});
