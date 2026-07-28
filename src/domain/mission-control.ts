import { z } from "zod";

const ScoreSchema = z.number().int().min(0).max(100);
const IsoDateSchema = z.string().datetime({ offset: true });

export const PipelineStageNameSchema = z.enum(["collect", "verify", "analyze", "rank", "editorial", "report", "video"]);
export type PipelineStageName = z.infer<typeof PipelineStageNameSchema>;

export const IntelligenceItemSchema = z.object({
  id: z.string().min(1), title: z.string().min(1).max(300), summary: z.string().min(20).max(800),
  sourceName: z.string().min(1).max(120), sourceDefinitionId: z.string().min(1).optional(), category: z.string().min(1).max(80),
  impactScore: ScoreSchema, confidenceScore: ScoreSchema, evidenceCount: z.number().int().nonnegative(),
  verificationStatus: z.enum(["pending", "verified", "rejected"]),
  editorialStatus: z.enum(["pending", "approved", "rejected", "published"]),
  sourceUrl: z.string().url().optional(), analysisStatus: z.enum(["deferred", "running", "completed", "failed", "skipped"]).optional(),
  relevanceScore: ScoreSchema.optional(),
  keyClaims: z.array(z.object({ claim: z.string().min(1).max(500), evidenceRefs: z.array(z.string().min(1).max(80)).max(5) }).strict()).max(8).optional(),
  impactRationale: z.string().min(1).max(800).optional(), confidenceRationale: z.string().min(1).max(800).optional(),
  limitations: z.array(z.string().min(1).max(300)).max(8).optional(),
  analysisModel: z.string().min(1).max(120).optional(), analysisPromptVersion: z.string().min(1).max(80).optional(),
  requiresHumanReview: z.literal(true).optional(), analysisErrorCode: z.string().min(1).max(80).optional(), analysisMessage: z.string().min(1).max(300).optional(),
  whyRanked: z.array(z.string().min(1).max(240)).max(5).optional(),
  publishedAt: IsoDateSchema.optional(), createdAt: IsoDateSchema, updatedAt: IsoDateSchema.optional(),
}).strict();
export type IntelligenceItem = z.infer<typeof IntelligenceItemSchema>;

export const PipelineStageResultSchema = z.object({
  stage: PipelineStageNameSchema, status: z.enum(["idle", "running", "success", "warning", "error"]),
  startedAt: IsoDateSchema.optional(), completedAt: IsoDateSchema.optional(), elapsedMs: z.number().int().nonnegative().optional(),
  inputCount: z.number().int().nonnegative().optional(), outputCount: z.number().int().nonnegative().optional(),
  message: z.string().max(500).optional(), errorCode: z.string().max(80).optional(),
}).strict();
export type PipelineStageResult = z.infer<typeof PipelineStageResultSchema>;

export const PipelineLogEntrySchema = z.object({
  id: z.string().min(1), timestamp: IsoDateSchema, stage: PipelineStageNameSchema,
  level: z.enum(["info", "success", "warning", "error"]), message: z.string().min(1).max(500),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
}).strict();
export type PipelineLogEntry = z.infer<typeof PipelineLogEntrySchema>;

export const WeeklyIntelligenceReportSchema = z.object({
  id: z.string().min(1), periodStart: IsoDateSchema, periodEnd: IsoDateSchema, generatedAt: IsoDateSchema,
  title: z.string().min(1), executiveSummary: z.string().min(20), topStories: z.array(IntelligenceItemSchema),
  dominantTrend: z.string().min(1), mostActiveCompany: z.string().optional(), standoutTechnology: z.string().optional(),
  whatToWatch: z.array(z.string().min(1)).max(5), overallWeekScore: ScoreSchema.optional(), status: z.enum(["draft", "ready"]),
}).strict();
export type WeeklyIntelligenceReport = z.infer<typeof WeeklyIntelligenceReportSchema>;

export const VideoProductionPackageSchema = z.object({
  title: z.string().min(1), narrationScript: z.string().min(20),
  scenes: z.array(z.object({ number: z.number().int().positive(), purpose: z.string().min(1), narration: z.string().min(1), visualDescription: z.string().min(1), imagePrompt: z.string().min(1) }).strict()),
  thumbnailPrompt: z.string().min(1), status: z.enum(["draft", "ready"]),
}).strict();
export type VideoProductionPackage = z.infer<typeof VideoProductionPackageSchema>;

export const MissionControlRequestSchema = z.object({
  mode: z.enum(["demo", "live"]),
  period: z.object({ start: IsoDateSchema, end: IsoDateSchema }).strict(),
}).strict();
export type MissionControlRequest = z.infer<typeof MissionControlRequestSchema>;

export interface MissionControlResponse {
  runId: string; mode: "demo" | "live"; status: "success" | "warning" | "error";
  startedAt: string; completedAt: string; elapsedMs: number; stages: PipelineStageResult[];
  logs: PipelineLogEntry[]; summary: { collected: number; qualified: number; verified: number; highImpact: number; editorialCandidates: number; approved: number; reportStatus: "not_created" | "ready"; videoPackageStatus: "not_created" | "ready" };
  items: IntelligenceItem[]; report: WeeklyIntelligenceReport | null; videoPackage: VideoProductionPackage | null;
  liveCollection?: LiveCollectionSummary;
  liveAnalysis?: { attemptedItems: number; analyzedItems: number; skippedItems: number; failedItems: number; durationMs: number; model?: string; promptVersion?: string };
}

export interface LiveCollectionSummary {
  totalRegistrySources: number;
  eligibleLiveSources: number;
  attemptedSources: number;
  successfulSources: number;
  failedSources: number;
  duplicateRecords: number;
  recordsCollected: number;
}

export function rankIntelligenceItems(items: IntelligenceItem[]): IntelligenceItem[] {
  return [...items].sort((a, b) => b.impactScore - a.impactScore || b.confidenceScore - a.confidenceScore || b.evidenceCount - a.evidenceCount || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}
