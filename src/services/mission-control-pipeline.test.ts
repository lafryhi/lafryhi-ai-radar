import { beforeEach, describe, expect, it } from "vitest";
import { MissionControlRequestSchema } from "@/domain/mission-control";
import { getDemoIntelligenceItems } from "@/services/mission-control-demo";
import { runMissionControl } from "@/services/mission-control-pipeline";
import type { RadarRepository } from "@/persistence/repository";

const request = MissionControlRequestSchema.parse({ mode: "demo", period: { start: "2026-01-01T00:00:00.000Z", end: "2026-01-07T00:00:00.000Z" } });

describe("Mission Control demo pipeline", () => {
  beforeEach(() => { process.env.AI_RADAR_DEMO_MODE = "true"; });
  it("produces stable prepared records and all seven stages", async () => { const first = await runMissionControl(request, () => new Date("2026-01-07T12:00:00.000Z")); const second = await runMissionControl(request, () => new Date("2026-01-07T12:00:00.000Z")); expect(first.items).toEqual(second.items); expect(first.stages.map((stage) => stage.stage)).toEqual(["collect", "verify", "analyze", "rank", "editorial", "report", "video"]); });
  it("keeps pending and rejected items out of report and video", async () => { const result = await runMissionControl(request, () => new Date("2026-01-07T12:00:00.000Z")); expect(result.report?.topStories.every((item) => item.editorialStatus === "approved")).toBe(true); expect(result.videoPackage?.scenes.length).toBeLessThanOrEqual(result.report?.topStories.length ?? 0); expect(result.items.some((item) => item.editorialStatus === "pending")).toBe(true); expect(result.items.some((item) => item.editorialStatus === "rejected")).toBe(true); });
  it("does not include secrets in execution logs", async () => { process.env.OPERATOR_ACCESS_TOKEN = "secret-value-that-must-not-appear"; const result = await runMissionControl(request, () => new Date("2026-01-07T12:00:00.000Z")); expect(JSON.stringify(result.logs)).not.toContain(process.env.OPERATOR_ACCESS_TOKEN); });
  it("does not mutate the demo seed between runs", () => { const first = getDemoIntelligenceItems(); first[0]!.whyRanked?.push("local-only"); expect(getDemoIntelligenceItems()[0]!.whyRanked).not.toContain("local-only"); });
  it("keeps live collection separate, skips zero-record analysis, and defers downstream outputs", async () => { const liveRequest = MissionControlRequestSchema.parse({ mode: "live", period: { start: "2026-01-01T00:00:00.000Z", end: "2026-01-31T23:59:59.000Z" } }); const repository = { listSourceDefinitions: async () => [] } as unknown as RadarRepository; const result = await runMissionControl(liveRequest, () => new Date("2026-01-07T12:00:00.000Z"), repository); expect(result.mode).toBe("live"); expect(result.report).toBeNull(); expect(result.videoPackage).toBeNull(); expect(result.stages.find((stage) => stage.stage === "analyze")?.message).toContain("skipped"); expect(result.stages.slice(3).every((stage) => stage.errorCode === "LIVE_DOWNSTREAM_DEFERRED")).toBe(true); expect(result.items).toEqual([]); });
});
