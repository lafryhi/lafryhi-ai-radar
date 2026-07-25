import type { AnalysisResult, SourceDefinition, SourceRecord } from "@/domain/schemas";

export function sourceDefinitionFixture(domain = "cloud.google.com", id = "source-definition-1"): SourceDefinition {
  return {
    id, displayName: "Official AI source", publisher: domain, canonicalDomain: domain,
    allowedFeedDomains: [], allowedArticleDomains: [],
    homepage: `https://${domain}`, rssUrl: null, documentationUrl: null,
    category: "ai_platform", language: "en", country: "US", trustLevel: "official",
    status: "enabled", requiresHumanReview: true, notes: "Deterministic test source.",
    createdAt: "2026-07-24T00:00:00.000Z", updatedAt: "2026-07-24T00:00:00.000Z",
  };
}

export const sourceFixture: SourceRecord = {
  id: "source-1", sourceUrl: "https://cloud.google.com/blog/test", sourceName: "cloud.google.com",
  title: "Verified test announcement", publishedAt: "2026-07-24T00:00:00.000Z",
  fetchedAt: "2026-07-24T01:00:00.000Z", normalizedText: "This is authoritative source text. ".repeat(20),
  contentHash: "a".repeat(64), sourceType: "official_announcement",
};

export const analysisFixture: AnalysisResult = {
  summary: "A sufficiently detailed summary grounded in the supplied announcement.",
  keyPoints: ["The source introduces a developer-facing capability.", "Human evaluation is required before adoption."],
  whyItMatters: "This matters because small operators can evaluate the announced capability.",
  category: "developer_announcement", relevanceScore: 71,
  importanceScore: 80, noveltyScore: 70, confidenceScore: 90, timelinessScore: 75,
  educationalValueScore: 65, developerImpactScore: 85, enterpriseImpactScore: 60, researchImpactScore: 40,
  overallRecommendation: "Needs Human Attention",
  recommendedAction: "Review the official documentation before deciding whether to test it.",
  reasoning: "The capability may improve a developer workflow, but the source does not establish suitability for every business.",
  targetAudience: ["Developers", "Small business operators"],
  relatedTopics: ["AI development", "Developer tooling"],
  mentionedCompanies: ["Google"],
  mentionedProducts: ["Gemini"],
  mentionedTechnologies: ["API"],
  entities: [
    { name: "Google", normalizedName: "Google", type: "company" },
    { name: "Gemini", normalizedName: "Gemini", type: "model" },
    { name: "API", normalizedName: "API", type: "api" },
  ],
  potentialRisks: ["The announcement does not provide production adoption evidence."],
  followUpRecommended: true, breakingNews: false, estimatedReadingTime: 3,
  evidence: [{ quote: "authoritative source text", significance: "Supports the announcement." }],
  warnings: [], opportunity: { isOpportunity: false, deadline: null, eligibility: null, benefit: null, effortEstimate: null },
  duplicateAnalysis: { similarityScore: 0, classification: "unique", relatedPreviousArticles: [], duplicateReason: null },
};

export const geminiAnalysisFixture = (() => {
  const output: Partial<AnalysisResult> = { ...analysisFixture };
  delete output.relevanceScore;
  return output as Omit<AnalysisResult, "relevanceScore">;
})();
