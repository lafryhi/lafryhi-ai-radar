import { describe, expect, it } from "vitest";
import type { StoredDecisionBrief } from "@/domain/public-mvp";
import { MemoryRepository } from "@/persistence/memory";
import {
  getDecisionProgress,
  listDecisionBriefsWithProgress,
  recordDecisionOutcome,
  submitDecisionUsefulness,
  transitionDecisionAction,
  updateDecisionActionNote,
} from "./decision-progress";

const ownerA = "11111111-1111-4111-8111-111111111111";
const ownerB = "22222222-2222-4222-8222-222222222222";
const briefAId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const briefBId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function brief(id: string, ownerId: string): StoredDecisionBrief {
  return {
    id,
    ownerId,
    businessProfileId: ownerId,
    signalId: "radar-published",
    businessName: "Example Business",
    businessContextSnapshot: {
      industry: "Education technology",
      companySize: "SMALL",
      aiMaturity: "PILOTING",
      businessGoals: ["Automate content production"],
      currentTools: ["Google Workspace"],
      budgetRange: "1K_TO_10K",
      riskTolerance: "MODERATE",
    },
    signalSnapshot: {
      id: "radar-published",
      sourceRecordId: "source-1",
      title: "A verified Gemini capability",
      description: "A verified capability is now available for controlled developer evaluation.",
      sourceName: "cloud.google.com",
      sourceUrl: "https://cloud.google.com/blog/test",
      publishedAt: "2026-07-29T00:00:00.000Z",
      signalImportance: 75,
    },
    result: {
      status: "INSUFFICIENT_EVIDENCE",
      stage: "DECISION_INTELLIGENCE",
      reason: "The verified evidence is insufficient for a responsible contextual recommendation.",
      missingEvidence: ["Business-specific operating evidence"],
    },
    createdAt: "2026-07-29T10:00:00.000Z",
    schemaVersion: 1,
  };
}

async function seeded() {
  const repository = new MemoryRepository();
  await repository.saveDecisionBrief(brief(briefAId, ownerA));
  return repository;
}

describe("Decision usefulness feedback", () => {
  it("lets the owner create and change one current rating while ignoring forged ownership", async () => {
    const repository = await seeded();
    const useful = await submitDecisionUsefulness(repository, ownerA, briefAId, { usefulness: "USEFUL", ownerId: ownerB }, "2026-07-29T11:00:00.000Z");
    const notUseful = await submitDecisionUsefulness(repository, ownerA, briefAId, { usefulness: "NOT_USEFUL" }, "2026-07-29T12:00:00.000Z");
    expect(useful.ownerId).toBe(ownerA);
    expect(notUseful).toMatchObject({ id: useful.id, usefulness: "NOT_USEFUL", createdAt: useful.createdAt, updatedAt: "2026-07-29T12:00:00.000Z" });
    expect((await getDecisionProgress(repository, ownerA, briefAId)).feedback).toEqual(notUseful);
  });

  it("rejects invalid values and cross-session feedback reads or writes", async () => {
    const repository = await seeded();
    await expect(submitDecisionUsefulness(repository, ownerA, briefAId, { usefulness: "MAYBE" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(submitDecisionUsefulness(repository, ownerB, briefAId, { usefulness: "USEFUL" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getDecisionProgress(repository, ownerB, briefAId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("Decision action transitions", () => {
  it("defaults to NOT_STARTED and supports every allowed transition with audit timestamps", async () => {
    const repository = await seeded();
    expect((await getDecisionProgress(repository, ownerA, briefAId)).actionStatus).toBe("NOT_STARTED");
    const started = await transitionDecisionAction(repository, ownerA, briefAId, { status: "IN_PROGRESS", actionNote: "Run a bounded pilot." }, "2026-07-29T11:00:00.000Z");
    const completed = await transitionDecisionAction(repository, ownerA, briefAId, { status: "COMPLETED", outcome: "POSITIVE", outcomeSummary: "Preparation time decreased." }, "2026-07-29T12:00:00.000Z");
    const reopened = await transitionDecisionAction(repository, ownerA, briefAId, { status: "IN_PROGRESS" }, "2026-07-29T13:00:00.000Z");
    const abandoned = await transitionDecisionAction(repository, ownerA, briefAId, { status: "ABANDONED" }, "2026-07-29T14:00:00.000Z");
    const resumed = await transitionDecisionAction(repository, ownerA, briefAId, { status: "IN_PROGRESS" }, "2026-07-29T15:00:00.000Z");
    expect(started.startedAt).toBe("2026-07-29T11:00:00.000Z");
    expect(completed.completedAt).toBe("2026-07-29T12:00:00.000Z");
    expect(reopened).toMatchObject({ outcome: "POSITIVE", outcomeSummary: "Preparation time decreased.", completedAt: completed.completedAt });
    expect(abandoned.abandonedAt).toBe("2026-07-29T14:00:00.000Z");
    expect(resumed).toMatchObject({ id: started.id, status: "IN_PROGRESS", abandonedAt: abandoned.abandonedAt });
    expect(resumed.statusHistory).toHaveLength(5);
  });

  it("rejects arbitrary statuses, invalid transitions, and cross-session changes", async () => {
    const repository = await seeded();
    await expect(transitionDecisionAction(repository, ownerA, briefAId, { status: "PAUSED" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(transitionDecisionAction(repository, ownerA, briefAId, { status: "COMPLETED" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(transitionDecisionAction(repository, ownerB, briefAId, { status: "IN_PROGRESS" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("maintains one current Action Record and validates action-note length", async () => {
    const repository = await seeded();
    const started = await transitionDecisionAction(repository, ownerA, briefAId, { status: "IN_PROGRESS" });
    const updated = await updateDecisionActionNote(repository, ownerA, briefAId, { actionNote: "Updated by the user." });
    expect(updated.id).toBe(started.id);
    expect(await repository.listDecisionActionsByOwner(ownerA)).toHaveLength(1);
    await expect(updateDecisionActionNote(repository, ownerA, briefAId, { actionNote: "x".repeat(501) })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("Decision outcomes and immutable decision data", () => {
  it("stores a validated user outcome only for a completed, owned action", async () => {
    const repository = await seeded();
    await transitionDecisionAction(repository, ownerA, briefAId, { status: "IN_PROGRESS" });
    await transitionDecisionAction(repository, ownerA, briefAId, { status: "COMPLETED" });
    const outcome = await recordDecisionOutcome(repository, ownerA, briefAId, { outcome: "NEUTRAL", outcomeSummary: "The user observed no material change." });
    expect(outcome).toMatchObject({ outcome: "NEUTRAL", outcomeSummary: "The user observed no material change." });
    await expect(recordDecisionOutcome(repository, ownerA, briefAId, { outcome: "SUCCESS" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(recordDecisionOutcome(repository, ownerB, briefAId, { outcome: "POSITIVE" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(recordDecisionOutcome(repository, ownerA, briefAId, { outcome: "POSITIVE", outcomeSummary: "x".repeat(501) })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("never changes the Business Context, Signal snapshot, or Decision Engine result", async () => {
    const repository = await seeded();
    const before = structuredClone(await repository.getDecisionBrief(briefAId));
    await submitDecisionUsefulness(repository, ownerA, briefAId, "USEFUL");
    await transitionDecisionAction(repository, ownerA, briefAId, { status: "IN_PROGRESS" });
    await transitionDecisionAction(repository, ownerA, briefAId, { status: "COMPLETED", outcome: "UNKNOWN" });
    const after = await repository.getDecisionBrief(briefAId);
    expect(after?.businessContextSnapshot).toEqual(before?.businessContextSnapshot);
    expect(after?.signalSnapshot).toEqual(before?.signalSnapshot);
    expect(after?.result).toEqual(before?.result);
  });
});

describe("Owner-scoped Decision Progress list data", () => {
  it("returns feedback, timestamps, outcomes, and correct action-status filters", async () => {
    const repository = await seeded();
    await repository.saveDecisionBrief(brief(briefBId, ownerA));
    await repository.saveDecisionBrief(brief("33333333-3333-4333-8333-333333333333", ownerB));
    await submitDecisionUsefulness(repository, ownerA, briefAId, "USEFUL");
    await transitionDecisionAction(repository, ownerA, briefAId, { status: "IN_PROGRESS" }, "2026-07-29T11:00:00.000Z");
    await transitionDecisionAction(repository, ownerA, briefAId, { status: "COMPLETED", outcome: "POSITIVE" }, "2026-07-29T12:00:00.000Z");

    const all = await listDecisionBriefsWithProgress(repository, ownerA);
    const completed = await listDecisionBriefsWithProgress(repository, ownerA, "COMPLETED");
    const notStarted = await listDecisionBriefsWithProgress(repository, ownerA, "NOT_STARTED");
    expect(all).toHaveLength(2);
    expect(completed).toHaveLength(1);
    expect(completed[0].progress).toMatchObject({ actionStatus: "COMPLETED", feedback: { usefulness: "USEFUL" }, action: { outcome: "POSITIVE", startedAt: "2026-07-29T11:00:00.000Z", completedAt: "2026-07-29T12:00:00.000Z" } });
    expect(notStarted.map((row) => row.brief.id)).toEqual([briefBId]);
  });
});
