import { z } from "zod";
import { AnalysisResultSchema, GeminiAnalysisOutputSchema, type AnalysisResult, type SourceRecord, type StoredAnalysis } from "@/domain/schemas";
import {
  GeminiDecisionEngine,
  SIGNAL_INTELLIGENCE_JSON_SCHEMA,
  SIGNAL_INTELLIGENCE_PROMPT_VERSION,
} from "./decision-engine";

export const PROMPT_VERSION = SIGNAL_INTELLIGENCE_PROMPT_VERSION;
export const GEMINI_RESPONSE_JSON_SCHEMA = SIGNAL_INTELLIGENCE_JSON_SCHEMA;

export interface PreviousArticleContext {
  sourceRecordId: string;
  title: string;
  sourceUrl: string;
  publishedAt: string;
  summary: string;
  keyPoints: string[];
  relatedTopics: string[];
  entities: Array<{ normalizedName: string; type: StoredAnalysis["entities"][number]["type"] }>;
}

export interface AnalysisContext {
  previousArticles: PreviousArticleContext[];
}

export interface AnalysisMetadata {
  result: AnalysisResult;
  model: string;
  tokenUsage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

export interface AiAnalyzer {
  analyze(source: SourceRecord, context?: AnalysisContext): Promise<AnalysisMetadata>;
}

export function parseGeminiResponse(text: string): AnalysisResult {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Gemini returned malformed JSON."); }
  const parsed = GeminiAnalysisOutputSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Gemini output failed schema validation: ${parsed.error.message}`);
  const normalized = normalizeDecisionIntelligence(parsed.data);
  return AnalysisResultSchema.parse({
    ...normalized,
    relevanceScore: calculateRelevanceScore(normalized),
  });
}

export function calculateRelevanceScore(result: z.infer<typeof GeminiAnalysisOutputSchema>) {
  return Math.round(
    result.importanceScore * 0.25 +
    result.noveltyScore * 0.1 +
    result.confidenceScore * 0.05 +
    result.timelinessScore * 0.1 +
    result.educationalValueScore * 0.1 +
    result.developerImpactScore * 0.15 +
    result.enterpriseImpactScore * 0.15 +
    result.researchImpactScore * 0.1,
  );
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.map((value) => value.trim()).filter((value) => {
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeDecisionIntelligence(result: z.infer<typeof GeminiAnalysisOutputSchema>) {
  const entityKeys = new Set<string>();
  return {
    ...result,
    keyPoints: unique(result.keyPoints),
    targetAudience: unique(result.targetAudience),
    relatedTopics: unique(result.relatedTopics),
    mentionedCompanies: unique(result.mentionedCompanies),
    mentionedProducts: unique(result.mentionedProducts),
    mentionedTechnologies: unique(result.mentionedTechnologies),
    potentialRisks: unique(result.potentialRisks),
    warnings: unique(result.warnings),
    entities: result.entities.map((entity) => ({
      ...entity,
      name: entity.name.trim(),
      normalizedName: entity.normalizedName.trim(),
    })).filter((entity) => {
      const key = `${entity.type}:${entity.normalizedName.toLocaleLowerCase()}`;
      if (entityKeys.has(key)) return false;
      entityKeys.add(key);
      return true;
    }),
    evidence: result.evidence.map((entry) => ({ ...entry, quote: entry.quote.trim(), significance: entry.significance.trim() })),
    duplicateAnalysis: {
      ...result.duplicateAnalysis,
      relatedPreviousArticles: result.duplicateAnalysis.relatedPreviousArticles.filter((article, index, articles) =>
        articles.findIndex((candidate) => candidate.sourceRecordId === article.sourceRecordId) === index),
    },
  };
}

export class VertexAiAnalyzer implements AiAnalyzer {
  private readonly engine = new GeminiDecisionEngine();

  async analyze(source: SourceRecord): Promise<AnalysisMetadata> {
    const signal = await this.engine.analyzeSignal(source);
    if (signal.status === "INSUFFICIENT_EVIDENCE") {
      throw new Error(`INSUFFICIENT_EVIDENCE: ${signal.reason}`);
    }

    const joinClaims = (claims: Array<{ text: string }>, fallback: string) =>
      (claims.map((claim) => claim.text).join(" ") || fallback).slice(0, 800);
    const ensureNarrative = (value: string, fallback: string) => value.length >= 20 ? value : fallback;
    const shortClaims = (claims: Array<{ text: string }>) => claims.map((claim) => claim.text.slice(0, 160));
    const summary = ensureNarrative(
      joinClaims(signal.whatHappened, ""),
      "The source contains a verified AI signal requiring human verification.",
    );
    const whyItMatters = ensureNarrative(
      joinClaims(signal.whyImportant, ""),
      "The source may be important, but business context is required before making a decision.",
    );
    const result = AnalysisResultSchema.parse({
      summary,
      keyPoints: shortClaims([...signal.whatHappened, ...signal.whatChanged]).slice(0, 8),
      whyItMatters,
      category: signal.category,
      importanceScore: signal.signalImportance,
      noveltyScore: 0,
      confidenceScore: signal.evidenceConfidence,
      timelinessScore: 0,
      educationalValueScore: 0,
      developerImpactScore: 0,
      enterpriseImpactScore: 0,
      researchImpactScore: 0,
      relevanceScore: signal.signalImportance,
      overallRecommendation: "Needs Human Attention",
      recommendedAction: "Add validated business context and run Decision Intelligence before choosing an action.",
      reasoning: whyItMatters,
      targetAudience: shortClaims(signal.affectedIndustries).slice(0, 8).length
        ? shortClaims(signal.affectedIndustries).slice(0, 8)
        : ["Human decision-maker"],
      relatedTopics: shortClaims([...signal.technologies, ...signal.whatChanged]).slice(0, 12),
      mentionedCompanies: signal.entities.filter((entity) => entity.type === "company").map((entity) => entity.normalizedName).slice(0, 12),
      mentionedProducts: signal.entities.filter((entity) => entity.type === "product").map((entity) => entity.normalizedName).slice(0, 12),
      mentionedTechnologies: shortClaims(signal.technologies).slice(0, 12),
      entities: signal.entities.map((entity) => ({
        name: entity.name,
        normalizedName: entity.normalizedName,
        type: entity.type,
      })),
      potentialRisks: shortClaims(signal.risks).slice(0, 10),
      followUpRecommended: true,
      breakingNews: false,
      estimatedReadingTime: Math.max(1, Math.min(60, Math.ceil(source.normalizedText.split(/\s+/).length / 220))),
      evidence: signal.evidence.slice(0, 5).map((evidence) => ({
        quote: evidence.quote,
        significance: evidence.significance,
      })),
      warnings: signal.warnings,
      opportunity: { isOpportunity: false, deadline: null, eligibility: null, benefit: null, effortEstimate: null },
      duplicateAnalysis: { similarityScore: 0, classification: "unique", relatedPreviousArticles: [], duplicateReason: null },
    });
    return { result, model: this.engine.modelUsed };
  }
}

export async function getAnalyzer(): Promise<AiAnalyzer> {
  if (process.env.AI_ADAPTER === "mock") throw new Error("The mock adapter is test-only and cannot be selected at runtime.");
  return new VertexAiAnalyzer();
}
