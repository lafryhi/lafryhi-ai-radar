import { describe, expect, it } from "vitest";
import type { DecisionEngineResult } from "@/domain/decision-intelligence";
import type { StoredDecisionBrief } from "@/domain/public-mvp";
import { MemoryRepository } from "@/persistence/memory";
import { average, getOperatorProductMetrics, getUserImpactMetrics, median, rate } from "./analytics";

const ownerA = "11111111-1111-4111-8111-111111111111";
const ownerB = "22222222-2222-4222-8222-222222222222";
const profileA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const profileB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const brief1 = "10000000-0000-4000-8000-000000000001";
const brief2 = "10000000-0000-4000-8000-000000000002";
const brief3 = "10000000-0000-4000-8000-000000000003";

function readyResult(position: "RUN_EXPERIMENT" | "MONITOR", score: number): DecisionEngineResult {
  const evidence = [{ id: "E1", quote: "verified source evidence", significance: "Supports the signal." }];
  return {
    status: "READY",
    signalIntelligence: {
      status: "READY", category: "developer_announcement",
      whatHappened: [{ text: "A capability is available.", evidenceIds: ["E1"] }],
      whatChanged: [{ text: "It can now be evaluated.", evidenceIds: ["E1"] }],
      whyImportant: [{ text: "Businesses can evaluate it.", evidenceIds: ["E1"] }],
      technologies: [{ text: "Gemini API", evidenceIds: ["E1"] }], affectedIndustries: [], risks: [], opportunities: [], entities: [],
      evidence, signalImportance: 75, evidenceConfidence: 90, warnings: [],
    },
    decisionBrief: {
      decisionQuestion: "Should this business evaluate the capability?",
      geminiInsight: [{ text: "The capability is available.", evidenceIds: ["E1"] }],
      businessImpact: [{ text: "Applicability depends on business context.", evidenceIds: ["E1"] }],
      availableOptions: [{ position: "RUN_EXPERIMENT", description: "Run a pilot.", supportingEvidenceIds: ["E1"] }, { position: "MONITOR", description: "Monitor evidence.", supportingEvidenceIds: ["E1"] }],
      recommendedPosition: position, recommendedAction: "Use a bounded, measured next step.", recommendationEvidenceIds: ["E1"],
      expectedBenefits: [], potentialRisks: [], estimatedEffort: { level: "LOW", rationale: "A bounded evaluation.", supportingEvidenceIds: ["E1"] },
      confidence: 80, supportingEvidenceIds: ["E1"], successCriteria: ["Measure the stated goal."], reconsiderationTriggers: ["Evidence changes."],
      businessContext: { industry: "Education technology", companySize: "SMALL", aiMaturity: "PILOTING", businessGoals: ["Automate content"], currentTools: [], budgetRange: "UNDER_1K", riskTolerance: "MODERATE" },
      supportingEvidence: evidence,
      score: { signalImportance: 75, evidenceConfidence: 90, businessApplicability: 70, urgency: 50, expectedImpact: 65, decisionScore: score },
    },
  };
}

function stored(id: string, ownerId: string, profileId: string, industry: string, signalId: string, result: DecisionEngineResult, createdAt: string): StoredDecisionBrief {
  return {
    id, ownerId, businessProfileId: profileId, signalId, businessName: ownerId === ownerA ? "Private Learning Studio" : "Private Local Shop",
    businessContextSnapshot: { industry, companySize: "SMALL", aiMaturity: "PILOTING", businessGoals: ["Improve operations"], currentTools: [], budgetRange: "UNDER_1K", riskTolerance: "MODERATE" },
    signalSnapshot: { id: signalId, sourceRecordId: `source-${signalId}`, title: signalId === "signal-1" ? "Gemini capability" : "Secondary signal", description: "A verified source-backed signal for analytics testing.", sourceName: "cloud.google.com", sourceUrl: `https://cloud.google.com/${signalId}`, publishedAt: "2026-07-29T00:00:00.000Z", signalImportance: 75 },
    result, createdAt, schemaVersion: 1,
  };
}

async function fixture() {
  const repository = new MemoryRepository();
  await repository.saveBusinessProfile({ id: profileA, ownerId: ownerA, businessName: "Private Learning Studio", industry: "Education technology", companySize: "SMALL", aiMaturity: "PILOTING", businessGoals: ["Automate content"], currentTools: [], budgetRange: "UNDER_1K", riskTolerance: "MODERATE", createdAt: "2026-07-29T08:00:00.000Z", updatedAt: "2026-07-29T08:00:00.000Z", schemaVersion: 1 });
  await repository.saveBusinessProfile({ id: profileB, ownerId: ownerB, businessName: "Private Local Shop", industry: "Retail", companySize: "SMALL", aiMaturity: "NONE", businessGoals: ["Reduce waste"], currentTools: [], budgetRange: "NO_BUDGET", riskTolerance: "LOW", createdAt: "2026-07-29T08:00:00.000Z", updatedAt: "2026-07-29T08:00:00.000Z", schemaVersion: 1 });
  await repository.saveDecisionBrief(stored(brief1, ownerA, profileA, "Education technology", "signal-1", readyResult("RUN_EXPERIMENT", 80), "2026-07-29T09:00:00.000Z"));
  await repository.saveDecisionBrief(stored(brief2, ownerB, profileB, "Retail", "signal-1", readyResult("MONITOR", 60), "2026-07-29T09:10:00.000Z"));
  await repository.saveDecisionBrief(stored(brief3, ownerA, profileA, "Education technology", "signal-2", { status: "INSUFFICIENT_EVIDENCE", stage: "SIGNAL_INTELLIGENCE", reason: "The source does not provide enough verified evidence.", missingEvidence: ["Implementation evidence"] }, "2026-07-29T09:20:00.000Z"));
  await repository.saveDecisionFeedback({ id: brief1, ownerId: ownerA, decisionBriefId: brief1, usefulness: "USEFUL", createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:05:00.000Z", schemaVersion: 1 });
  await repository.saveDecisionFeedback({ id: brief2, ownerId: ownerB, decisionBriefId: brief2, usefulness: "NOT_USEFUL", createdAt: "2026-07-29T10:10:00.000Z", updatedAt: "2026-07-29T10:10:00.000Z", schemaVersion: 1 });
  await repository.saveDecisionAction({ id: brief1, ownerId: ownerA, decisionBriefId: brief1, businessProfileId: profileA, signalId: "signal-1", status: "IN_PROGRESS", actionNote: "Private action note", outcome: "POSITIVE", outcomeSummary: "Private outcome summary", startedAt: "2026-07-29T11:00:00.000Z", completedAt: "2026-07-29T12:00:00.000Z", abandonedAt: null, createdAt: "2026-07-29T11:00:00.000Z", updatedAt: "2026-07-29T13:00:00.000Z", statusHistory: [{ from: "NOT_STARTED", to: "IN_PROGRESS", changedAt: "2026-07-29T11:00:00.000Z" }, { from: "IN_PROGRESS", to: "COMPLETED", changedAt: "2026-07-29T12:00:00.000Z" }, { from: "COMPLETED", to: "IN_PROGRESS", changedAt: "2026-07-29T13:00:00.000Z" }], schemaVersion: 1 });
  await repository.saveDecisionAction({ id: brief2, ownerId: ownerB, decisionBriefId: brief2, businessProfileId: profileB, signalId: "signal-1", status: "IN_PROGRESS", actionNote: null, outcome: null, outcomeSummary: null, startedAt: "2026-07-29T11:10:00.000Z", completedAt: null, abandonedAt: "2026-07-29T12:10:00.000Z", createdAt: "2026-07-29T11:10:00.000Z", updatedAt: "2026-07-29T13:10:00.000Z", statusHistory: [{ from: "NOT_STARTED", to: "IN_PROGRESS", changedAt: "2026-07-29T11:10:00.000Z" }, { from: "IN_PROGRESS", to: "ABANDONED", changedAt: "2026-07-29T12:10:00.000Z" }, { from: "ABANDONED", to: "IN_PROGRESS", changedAt: "2026-07-29T13:10:00.000Z" }], schemaVersion: 1 });
  return repository;
}

describe("analytics metric definitions", () => {
  it("calculates rates, averages, medians, and unavailable denominators honestly", () => {
    expect(rate(1, 2).value).toBe(0.5);
    expect(rate(0, 0)).toEqual({ numerator: 0, denominator: 0, value: null });
    expect(average([80, 60])).toBe(70);
    expect(median([80, 60])).toBe(70);
    expect(median([])).toBeNull();
  });

  it("uses historical transitions after reopening and resuming", async () => {
    const metrics = await getOperatorProductMetrics(await fixture());
    expect(metrics.actionStartRate.value).toBe(1);
    expect(metrics.actionCompletionRate.value).toBe(0.5);
    expect(metrics.actionAbandonmentRate.value).toBe(0.5);
    expect(metrics.positiveOutcomeRate.value).toBe(1);
    expect(metrics.insufficientEvidenceRate.value).toBeCloseTo(1 / 3);
    expect(metrics.averageDecisionScore).toBe(70);
    expect(metrics.medianDecisionScore).toBe(70);
  });
});

describe("user analytics ownership and timeline", () => {
  it("returns only owner-scoped records and a chronological, sanitized timeline", async () => {
    const repository = await fixture();
    const user = await getUserImpactMetrics(repository, ownerA);
    const other = await getUserImpactMetrics(repository, ownerB);
    expect(user).toMatchObject({ businessProfiles: 1, totalDecisionBriefs: 2, usefulDecisionBriefs: 1, notUsefulDecisionBriefs: 0, actionsInProgress: 1, positiveOutcomes: 1 });
    expect(other).toMatchObject({ businessProfiles: 1, totalDecisionBriefs: 1, usefulDecisionBriefs: 0, notUsefulDecisionBriefs: 1 });
    expect(user.timeline.map((event) => event.type)).toEqual(expect.arrayContaining(["DECISION_CREATED", "FEEDBACK_SUBMITTED", "FEEDBACK_UPDATED", "ACTION_STARTED", "ACTION_COMPLETED", "ACTION_REOPENED", "OUTCOME_RECORDED"]));
    expect(user.timeline.every((event, index, events) => index === 0 || events[index - 1].timestamp <= event.timestamp)).toBe(true);
    const serialized = JSON.stringify(user.timeline);
    expect(serialized).not.toContain("Private action note");
    expect(serialized).not.toContain("Private outcome summary");
    expect(serialized).not.toContain(ownerB);
  });
});

describe("operator aggregate breakdowns and privacy", () => {
  it("computes industry, position, status, outcome, signal, and funnel aggregates", async () => {
    const metrics = await getOperatorProductMetrics(await fixture());
    expect(metrics).toMatchObject({ totalBusinessProfiles: 2, totalAnonymousOwners: 2, totalDecisionBriefs: 3, readyDecisionBriefs: 2, insufficientEvidenceBriefs: 1, totalUsefulnessRatings: 2, totalActionRecords: 2, activeIndustries: 2, publishedSignalsUsed: 2 });
    expect(metrics.industries.find((row) => row.industry === "Education technology")).toMatchObject({ businessProfiles: 1, decisionBriefs: 2 });
    expect(metrics.positions.find((row) => row.position === "RUN_EXPERIMENT")).toMatchObject({ count: 1, percentage: { value: 0.5 } });
    expect(metrics.positions.reduce((total, row) => total + row.count, 0)).toBe(2);
    expect(metrics.actionStatuses.find((row) => row.status === "IN_PROGRESS")?.count).toBe(2);
    expect(metrics.actionStatuses.find((row) => row.status === "NOT_STARTED")?.count).toBe(1);
    expect(metrics.outcomes.find((row) => row.outcome === "POSITIVE")?.count).toBe(1);
    expect(metrics.signals[0]).toMatchObject({ signalId: "signal-1", decisionBriefs: 2, averageDecisionScore: 70 });
    expect(metrics.funnel.map((stage) => stage.count)).toEqual([2, 3, 2, 2, 1, 1]);
  });

  it("contains no private identifiers or user-entered content", async () => {
    const serialized = JSON.stringify(await getOperatorProductMetrics(await fixture()));
    for (const privateValue of [ownerA, ownerB, profileA, profileB, "Private Learning Studio", "Private Local Shop", "Private action note", "Private outcome summary"]) {
      expect(serialized).not.toContain(privateValue);
    }
    expect(serialized).not.toContain("ownerId");
    expect(serialized).not.toContain("businessName");
    expect(serialized).not.toContain("actionNote");
    expect(serialized).not.toContain("outcomeSummary");
  });
});
