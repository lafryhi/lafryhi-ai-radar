import { z } from "zod";

export const LIVE_ANALYSIS_PROMPT_VERSION = "live-analysis-v1";
export const LIVE_ANALYSIS_MAX_CONTENT_CHARS = 20_000;
export const LIVE_ANALYSIS_MAX_OUTPUT_TOKENS = 2_048;

const score = z.number().int().min(0).max(100);

export const LiveAnalysisClaimSchema = z.object({
  claim: z.string().trim().min(1).max(500),
  evidenceRefs: z.array(z.string().trim().min(1).max(80)).max(5),
}).strict();

export const LiveAnalysisOutputSchema = z.object({
  summary: z.string().trim().min(20).max(800),
  category: z.string().trim().min(1).max(80),
  relevanceScore: score,
  impactScore: score,
  confidenceScore: score,
  keyClaims: z.array(LiveAnalysisClaimSchema).max(8),
  impactRationale: z.string().trim().min(10).max(800),
  confidenceRationale: z.string().trim().min(10).max(800),
  limitations: z.array(z.string().trim().min(1).max(300)).max(8),
  requiresHumanReview: z.literal(true),
}).strict().superRefine((value, context) => {
  if (value.keyClaims.length === 0 && !value.limitations.some((limitation) => /insufficient|incomplete|not enough|missing/i.test(limitation))) {
    context.addIssue({ code: "custom", path: ["keyClaims"], message: "Empty claims require an explicit source-insufficiency limitation." });
  }
});

export type LiveAnalysisOutput = z.infer<typeof LiveAnalysisOutputSchema>;

export interface LiveAnalysisPromptInput {
  intelligenceItemId: string;
  sourceDefinitionId?: string;
  sourceName: string;
  sourceTrustLevel: string;
  articleUrl: string;
  articleTitle: string;
  publicationDate: string;
  content: string;
  evidenceIdentifiers: string[];
}

export const LIVE_ANALYSIS_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    category: { type: "string" },
    relevanceScore: { type: "integer" },
    impactScore: { type: "integer" },
    confidenceScore: { type: "integer" },
    keyClaims: {
      type: "array",
      items: {
        type: "object",
        properties: { claim: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } } },
        required: ["claim", "evidenceRefs"],
      },
    },
    impactRationale: { type: "string" },
    confidenceRationale: { type: "string" },
    limitations: { type: "array", items: { type: "string" } },
    requiresHumanReview: { type: "boolean" },
  },
  required: ["summary", "category", "relevanceScore", "impactScore", "confidenceScore", "keyClaims", "impactRationale", "confidenceRationale", "limitations", "requiresHumanReview"],
} as const;
