import { rankIntelligenceItems, type IntelligenceItem, type MissionControlRequest, type MissionControlResponse, type PipelineLogEntry, type PipelineStageName, type PipelineStageResult, WeeklyIntelligenceReportSchema, VideoProductionPackageSchema } from "@/domain/mission-control";
import { getDemoIntelligenceItems, isDemoModeEnabled } from "@/services/mission-control-demo";
import { collectLiveIntelligenceItems } from "@/services/mission-control-live";
import { analyzeLiveIntelligenceItems } from "@/services/live-analysis";
import { VertexAiAnalyzer } from "@/services/ai";
import type { RadarRepository } from "@/persistence/repository";

export class MissionControlConflictError extends Error {}
export class MissionControlInputError extends Error {}

let activeRun = false;
const stageDurations: Record<PipelineStageName, number> = { collect: 180, verify: 220, analyze: 320, rank: 140, editorial: 260, report: 180, video: 160 };
const stageOrder: PipelineStageName[] = ["collect", "verify", "analyze", "rank", "editorial", "report", "video"];

function log(stage: PipelineStageName, level: PipelineLogEntry["level"], message: string, timestamp: string, index: number, metadata?: PipelineLogEntry["metadata"]): PipelineLogEntry {
  return { id: `mission-log-${index + 1}`, timestamp, stage, level, message, metadata };
}

function stage(stageName: PipelineStageName, status: PipelineStageResult["status"], startedAt: string, elapsedMs: number, inputCount: number, outputCount: number, message: string, errorCode?: string): PipelineStageResult {
  const completedAt = new Date(new Date(startedAt).getTime() + elapsedMs).toISOString();
  return { stage: stageName, status, startedAt, completedAt, elapsedMs, inputCount, outputCount, message, ...(errorCode ? { errorCode } : {}) };
}

function buildReport(request: MissionControlRequest, approved: IntelligenceItem[], generatedAt: string) {
  return WeeklyIntelligenceReportSchema.parse({ id: "demo-weekly-report", periodStart: request.period.start, periodEnd: request.period.end, generatedAt, title: "AI Radar Weekly Intelligence", executiveSummary: `This prepared demo report contains ${approved.length} editorially approved intelligence items for operator review.`, topStories: approved, dominantTrend: "Trusted AI adoption and responsible deployment", mostActiveCompany: "Prepared sample", standoutTechnology: "Multimodal AI", whatToWatch: ["Human editorial decisions", "Evidence quality", "Responsible deployment signals"], overallWeekScore: approved.length ? Math.round(approved.reduce((sum, item) => sum + item.impactScore, 0) / approved.length) : 0, status: "ready" });
}

function buildVideo(report: NonNullable<ReturnType<typeof buildReport>>) {
  return VideoProductionPackageSchema.parse({ title: report.title, narrationScript: `This week, AI Radar highlights ${report.topStories.length} approved intelligence signals. The editorial team selected these stories for their impact, confidence, and evidence depth.`, scenes: report.topStories.slice(0, 3).map((item, index) => ({ number: index + 1, purpose: "Approved intelligence highlight", narration: item.title, visualDescription: `Clean editorial card for ${item.category}.`, imagePrompt: `Editorial illustration for ${item.category}, no logos, no fabricated people.` })), thumbnailPrompt: "Clean blue and yellow editorial intelligence dashboard with the words AI Radar Weekly Intelligence", status: "ready" });
}

export async function runMissionControl(request: MissionControlRequest, now = () => new Date(), repository?: RadarRepository): Promise<MissionControlResponse> {
  if (activeRun) throw new MissionControlConflictError("A Mission Control run is already active.");
  if (request.mode === "demo" && !isDemoModeEnabled()) throw new MissionControlInputError("Demo mode is disabled. Set AI_RADAR_DEMO_MODE=true for the prepared demo workflow.");
  activeRun = true;
  try {
    const start = now(); const startedAt = start.toISOString();
    if (request.mode === "live") {
      const collectionStarted = Date.now();
      if (!repository) {
        const completedAt = new Date(start.getTime() + 1).toISOString();
        return { runId: `mission-live-${start.getTime()}`, mode: "live", status: "error", startedAt, completedAt, elapsedMs: 1, stages: [stage("collect", "error", startedAt, 1, 0, 0, "Live collection requires the server repository.", "LIVE_REPOSITORY_UNAVAILABLE"), ...stageOrder.slice(1).map((name) => stage(name, "warning", completedAt, 0, 0, 0, "Deferred until live collection succeeds.", "LIVE_ANALYSIS_DEFERRED"))], logs: [log("collect", "error", "Live collection could not start safely.", startedAt, 0)], summary: { collected: 0, qualified: 0, verified: 0, highImpact: 0, editorialCandidates: 0, approved: 0, reportStatus: "not_created", videoPackageStatus: "not_created" }, items: [], report: null, videoPackage: null, liveAnalysis: { attemptedItems: 0, analyzedItems: 0, skippedItems: 0, failedItems: 0, durationMs: 0, promptVersion: "live-analysis-v1" } };
      }
      const collection = await collectLiveIntelligenceItems(repository, request);
      const collectionElapsed = Math.max(1, Date.now() - collectionStarted);
      const collectStage = stage("collect", collection.status === "error" ? "error" : collection.status === "warning" ? "warning" : "success", startedAt, collectionElapsed, collection.summary.attemptedSources, collection.items.length, collection.status === "error" ? "Live collection failed safely." : `Live collection completed with ${collection.items.length} usable records.`);
      const analysis = collection.items.length === 0
        ? await analyzeLiveIntelligenceItems(repository, [], { now: () => Date.now() })
        : await analyzeLiveIntelligenceItems(repository, collection.items, { createProvider: () => new VertexAiAnalyzer() });
      const analysisElapsed = analysis.summary.durationMs;
      const analysisStartedAt = new Date(start.getTime() + collectionElapsed).toISOString();
      const analysisCompletedAt = new Date(new Date(analysisStartedAt).getTime() + analysisElapsed).toISOString();
      const analysisStageStatus = analysis.status === "error" ? "error" : analysis.status === "warning" ? "warning" : "success";
      const analysisStage = stage("analyze", analysisStageStatus, analysisStartedAt, analysisElapsed, collection.items.length, analysis.summary.analyzedItems, analysis.summary.attemptedItems === 0 || analysis.summary.skippedItems > 0 && analysis.summary.analyzedItems === 0 ? "Live analysis skipped; no usable source material was available." : analysis.summary.analyzedItems === 0 ? "Live analysis failed safely." : `Live analysis completed for ${analysis.summary.analyzedItems} records.` , analysis.status === "error" ? "LIVE_ANALYSIS_FAILED" : undefined);
      const downstream = stageOrder.slice(3).map((name) => stage(name, "warning", analysisCompletedAt, 0, analysis.items.length, 0, "Deferred in Sprint 3.2; live ranking, editorial review, report, and video are not run.", "LIVE_DOWNSTREAM_DEFERRED"));
      const overallStatus = analysis.status === "error" || collection.status === "error" ? "error" : analysis.status === "warning" || collection.status === "warning" ? "warning" : "success";
      return { runId: `mission-live-${start.getTime()}`, mode: "live", status: overallStatus, startedAt, completedAt: analysisCompletedAt, elapsedMs: collectionElapsed + analysisElapsed, stages: [collectStage, stage("verify", "warning", analysisStartedAt, 0, analysis.items.length, 0, "Deferred in Sprint 3.2; live verification is not run.", "LIVE_DOWNSTREAM_DEFERRED"), analysisStage, ...downstream], logs: [...collection.logs, ...analysis.logs], summary: { collected: collection.items.length, qualified: analysis.summary.analyzedItems, verified: 0, highImpact: analysis.items.filter((item) => item.impactScore >= 80).length, editorialCandidates: 0, approved: 0, reportStatus: "not_created", videoPackageStatus: "not_created" }, items: analysis.items, report: null, videoPackage: null, liveCollection: collection.summary, liveAnalysis: analysis.summary };
    }
    const items = getDemoIntelligenceItems(); const ranked = rankIntelligenceItems(items); const approved = ranked.filter((item) => item.verificationStatus === "verified" && item.editorialStatus === "approved");
    let offset = 0; const stages: PipelineStageResult[] = []; const logs: PipelineLogEntry[] = [];
    const add = (name: PipelineStageName, input: number, output: number, message: string, level: PipelineLogEntry["level"] = "success") => { const started = new Date(start.getTime() + offset).toISOString(); const duration = stageDurations[name]; stages.push(stage(name, "success", started, duration, input, output, message)); logs.push(log(name, level, message, started, logs.length, { inputCount: input, outputCount: output })); offset += duration; };
    add("collect", 0, items.length, "Collected prepared sample records."); add("verify", items.length, items.filter((item) => item.verificationStatus === "verified").length, "Verified prepared sample evidence status."); add("analyze", items.length, items.length, "Analysis completed for prepared sample items."); add("rank", items.length, ranked.length, "Ranked items by impact, confidence, and evidence."); add("editorial", ranked.length, approved.length, "Applied human editorial status; pending and rejected items remain excluded.");
    const generatedAt = new Date(start.getTime() + offset).toISOString(); const report = buildReport(request, approved, generatedAt); add("report", approved.length, 1, "Weekly intelligence report is ready."); const videoPackage = buildVideo(report); add("video", report.topStories.length, 1, "Video production package is ready.");
    const completedAt = new Date(start.getTime() + offset).toISOString();
    return { runId: `mission-demo-${start.getTime()}`, mode: "demo", status: "success", startedAt, completedAt, elapsedMs: offset, stages, logs, summary: { collected: items.length, qualified: items.length, verified: approved.length + ranked.filter((item) => item.editorialStatus === "rejected" || item.editorialStatus === "pending").length, highImpact: ranked.filter((item) => item.impactScore >= 80).length, editorialCandidates: ranked.length, approved: approved.length, reportStatus: "ready", videoPackageStatus: "ready" }, items: ranked, report, videoPackage };
  } finally { activeRun = false; }
}
