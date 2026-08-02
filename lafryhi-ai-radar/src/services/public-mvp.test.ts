import { describe, expect, it } from "vitest";
import type { BusinessContext, DecisionEngineResult, ReadySignalIntelligence } from "@/domain/decision-intelligence";
import { MemoryRepository } from "@/persistence/memory";
import { analysisFixture, sourceFixture } from "@/test/fixtures";
import { calculateDecisionScore } from "./decision-engine";
import {
  generateOwnedDecisionBrief,
  getOwnedBusinessProfile,
  getOwnedDecisionBrief,
  listPublicSignals,
  saveBusinessProfile,
  type BusinessProfileInput,
  type DecisionEngineRunner,
} from "./public-mvp";

const ownerA = "11111111-1111-4111-8111-111111111111";
const ownerB = "22222222-2222-4222-8222-222222222222";

const educationProfile: BusinessProfileInput = {
  businessName: "Learning Studio",
  industry: "Education technology",
  companySize: "SMALL",
  aiMaturity: "PILOTING",
  businessGoals: ["Automate content production"],
  currentTools: ["Google Workspace"],
  budgetRange: "1K_TO_10K",
  riskTolerance: "MODERATE",
};

const retailerProfile: BusinessProfileInput = {
  businessName: "Local Market",
  industry: "Traditional local retail",
  companySize: "SMALL",
  aiMaturity: "NONE",
  businessGoals: ["Reduce inventory waste"],
  currentTools: [],
  budgetRange: "UNDER_1K",
  riskTolerance: "LOW",
};

const signal: ReadySignalIntelligence = {
  status: "READY",
  category: "developer_announcement",
  whatHappened: [{ text: "A Gemini capability is now available.", evidenceIds: ["E1"] }],
  whatChanged: [{ text: "Developers can evaluate the capability.", evidenceIds: ["E1"] }],
  whyImportant: [{ text: "The capability can be tested in software workflows.", evidenceIds: ["E1"] }],
  technologies: [{ text: "Gemini API", evidenceIds: ["E1"] }],
  affectedIndustries: [],
  risks: [],
  opportunities: [],
  entities: [{ name: "Gemini", normalizedName: "Gemini", type: "model", evidenceIds: ["E1"] }],
  evidence: [{ id: "E1", quote: "authoritative source text", significance: "Supports availability." }],
  signalImportance: 75,
  evidenceConfidence: 90,
  warnings: [],
};

function readyResult(context: BusinessContext): DecisionEngineResult {
  const experimentalFit = context.aiMaturity !== "NONE" && context.businessGoals.some((goal) => goal.includes("content"));
  const recommendedPosition = experimentalFit ? "RUN_EXPERIMENT" : "MONITOR";
  const components = {
    signalImportance: signal.signalImportance,
    evidenceConfidence: signal.evidenceConfidence,
    businessApplicability: experimentalFit ? 85 : 35,
    urgency: experimentalFit ? 60 : 25,
    expectedImpact: experimentalFit ? 80 : 30,
  };
  return {
    status: "READY",
    signalIntelligence: signal,
    decisionBrief: {
      decisionQuestion: `Should this ${context.industry} business evaluate the Gemini capability?`,
      geminiInsight: [{ text: "The capability is available for evaluation.", evidenceIds: ["E1"] }],
      businessImpact: [{ text: "Applicability depends on the supplied business goal and maturity.", evidenceIds: ["E1"] }],
      availableOptions: [
        { position: "RUN_EXPERIMENT", description: "Run a bounded pilot.", supportingEvidenceIds: ["E1"] },
        { position: "MONITOR", description: "Wait for more applicable evidence.", supportingEvidenceIds: ["E1"] },
      ],
      recommendedPosition,
      recommendedAction: experimentalFit ? "Run a small, measured content workflow pilot." : "Monitor until evidence matches the inventory goal.",
      recommendationEvidenceIds: ["E1"],
      expectedBenefits: [{ text: "A bounded evaluation can test the announced capability.", evidenceIds: ["E1"] }],
      potentialRisks: [{ text: "The source does not establish business-specific outcomes.", evidenceIds: ["E1"] }],
      estimatedEffort: { level: experimentalFit ? "MEDIUM" : "LOW", rationale: "Effort depends on current tools and maturity.", supportingEvidenceIds: ["E1"] },
      confidence: experimentalFit ? 80 : 60,
      supportingEvidenceIds: ["E1"],
      successCriteria: ["Measure the outcome against the primary goal."],
      reconsiderationTriggers: ["Reconsider if verified evidence or business priorities change."],
      businessContext: context,
      supportingEvidence: signal.evidence,
      score: calculateDecisionScore(components),
    },
  };
}

class ContextAwareEngine implements DecisionEngineRunner {
  contexts: BusinessContext[] = [];
  async run(_source: typeof sourceFixture, context: BusinessContext) {
    this.contexts.push(context);
    return { model: "test-context-engine", result: readyResult(context) };
  }
}

async function seedPublishedSignal(repository: MemoryRepository) {
  await repository.saveSource(sourceFixture);
  await repository.saveRadarItem({
    id: "radar-published",
    publicTitle: "A newly available Gemini capability",
    publicSummary: "A verified Gemini capability is now available for developer evaluation.",
    whyItMatters: "Businesses may assess whether the capability supports a validated operational goal.",
    recommendedAction: "Add Business Context before choosing whether to act.",
    category: "developer_announcement",
    relevanceScore: 75,
    confidenceScore: 90,
    originalSourceUrl: sourceFixture.sourceUrl,
    sourceName: sourceFixture.sourceName,
    sourcePublishedAt: sourceFixture.publishedAt,
    publicationState: "published",
    sourceRecordId: sourceFixture.id,
    processingRunId: "run-1",
    analysisResultId: "analysis-1",
    reviewDecisionId: "review-approved",
    publishedAt: "2026-07-29T10:00:00.000Z",
  });
}

describe("Public MVP business profiles", () => {
  it("accepts valid input, rejects invalid input, and ignores a forged owner ID", async () => {
    const repository = new MemoryRepository();
    const profile = await saveBusinessProfile(repository, ownerA, { ...educationProfile, ownerId: ownerB });
    expect(profile.ownerId).toBe(ownerA);
    await expect(saveBusinessProfile(repository, ownerA, { ...educationProfile, businessGoals: [] })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("prevents one anonymous session from reading another session's profile", async () => {
    const repository = new MemoryRepository();
    const profile = await saveBusinessProfile(repository, ownerA, educationProfile);
    expect(await getOwnedBusinessProfile(repository, ownerA, profile.id)).toEqual(profile);
    expect(await getOwnedBusinessProfile(repository, ownerB, profile.id)).toBeNull();
  });
});

describe("Public signal selection", () => {
  it("returns published, source-backed signals and excludes pending or rejected analyses", async () => {
    const repository = new MemoryRepository();
    await seedPublishedSignal(repository);
    await repository.saveAnalysis({
      ...analysisFixture,
      id: "analysis-pending",
      sourceRecordId: sourceFixture.id,
      processingRunId: "run-pending",
      createdAt: "2026-07-29T09:00:00.000Z",
    });
    await repository.saveReview({ id: "review-rejected", analysisResultId: "analysis-pending", status: "rejected", reviewerNote: "Not publishable.", reviewedAt: "2026-07-29T09:30:00.000Z" });
    expect((await listPublicSignals(repository)).map((item) => item.id)).toEqual(["radar-published"]);
  });
});

describe("Public Decision Brief generation and access", () => {
  it("passes exact saved context to Stage B and produces materially different decisions for the same signal", async () => {
    const repository = new MemoryRepository();
    await seedPublishedSignal(repository);
    const education = await saveBusinessProfile(repository, ownerA, educationProfile);
    const retailer = await saveBusinessProfile(repository, ownerB, retailerProfile);
    const engine = new ContextAwareEngine();

    const educationBrief = await generateOwnedDecisionBrief(repository, engine, ownerA, education.id, "radar-published");
    const retailerBrief = await generateOwnedDecisionBrief(repository, engine, ownerB, retailer.id, "radar-published");

    expect(engine.contexts).toEqual([
      expect.objectContaining({ industry: "Education technology", businessGoals: ["Automate content production"], aiMaturity: "PILOTING", riskTolerance: "MODERATE" }),
      expect.objectContaining({ industry: "Traditional local retail", businessGoals: ["Reduce inventory waste"], aiMaturity: "NONE", riskTolerance: "LOW" }),
    ]);
    expect(educationBrief.result.status === "READY" && educationBrief.result.decisionBrief.recommendedPosition).toBe("RUN_EXPERIMENT");
    expect(retailerBrief.result.status === "READY" && retailerBrief.result.decisionBrief.recommendedPosition).toBe("MONITOR");
    expect(educationBrief.result.status === "READY" && educationBrief.result.decisionBrief.score.decisionScore).toBe(79);
  });

  it("enforces brief ownership and preserves the historical Business Context snapshot", async () => {
    const repository = new MemoryRepository();
    await seedPublishedSignal(repository);
    const profile = await saveBusinessProfile(repository, ownerA, educationProfile);
    const brief = await generateOwnedDecisionBrief(repository, new ContextAwareEngine(), ownerA, profile.id, "radar-published");
    await saveBusinessProfile(repository, ownerA, { ...educationProfile, industry: "Professional services" });

    expect(await getOwnedDecisionBrief(repository, ownerA, brief.id)).toEqual(brief);
    expect(await getOwnedDecisionBrief(repository, ownerB, brief.id)).toBeNull();
    expect((await repository.getDecisionBrief(brief.id))?.businessContextSnapshot.industry).toBe("Education technology");
  });

  it("persists INSUFFICIENT_EVIDENCE without a fabricated recommendation", async () => {
    const repository = new MemoryRepository();
    await seedPublishedSignal(repository);
    const profile = await saveBusinessProfile(repository, ownerA, educationProfile);
    const engine: DecisionEngineRunner = {
      async run() {
        return {
          model: "test",
          result: {
            status: "INSUFFICIENT_EVIDENCE",
            stage: "SIGNAL_INTELLIGENCE",
            reason: "The verified source does not support the required factual analysis.",
            missingEvidence: ["Independent implementation details"],
          },
        };
      },
    };
    const brief = await generateOwnedDecisionBrief(
      repository,
      engine,
      ownerA,
      profile.id,
      "radar-published",
      "2026-07-29T12:00:00.000Z",
    );
    expect(brief.result).toEqual(expect.objectContaining({ status: "INSUFFICIENT_EVIDENCE" }));
    expect("decisionBrief" in brief.result).toBe(false);
    expect((await repository.getUsageCounter(ownerA, "2026-07"))?.decisionBriefCount).toBe(1);
  });

  it("deduplicates rapid repeated generation while allowing later intentional requests", async () => {
    const repository = new MemoryRepository();
    await seedPublishedSignal(repository);
    const profile = await saveBusinessProfile(repository, ownerA, educationProfile);
    const engine = new ContextAwareEngine();
    const requestId = "44444444-4444-4444-8444-444444444444";
    const first = await generateOwnedDecisionBrief(repository, engine, ownerA, profile.id, "radar-published", "2026-07-29T12:00:00.000Z", requestId);
    const repeated = await generateOwnedDecisionBrief(repository, engine, ownerA, profile.id, "radar-published", "2026-07-29T12:00:01.000Z", requestId);
    const later = await generateOwnedDecisionBrief(repository, engine, ownerA, profile.id, "radar-published", "2026-07-29T13:00:00.000Z", "55555555-5555-4555-8555-555555555555");
    expect(repeated.id).toBe(first.id);
    expect(later.id).not.toBe(first.id);
    expect(engine.contexts).toHaveLength(2);
    expect(await repository.listDecisionBriefsByOwner(ownerA)).toHaveLength(2);
    expect((await repository.getUsageCounter(ownerA, "2026-07"))?.decisionBriefCount).toBe(2);
  });

  it("does not consume usage when Gemini generation fails", async () => {
    const repository = new MemoryRepository();
    await seedPublishedSignal(repository);
    const profile = await saveBusinessProfile(repository, ownerA, educationProfile);
    const engine: DecisionEngineRunner = { async run() { throw new Error("provider unavailable"); } };
    await expect(generateOwnedDecisionBrief(repository, engine, ownerA, profile.id, "radar-published", "2026-07-29T12:00:00.000Z")).rejects.toThrow("provider unavailable");
    expect(await repository.getUsageCounter(ownerA, "2026-07")).toBeNull();
  });
});
