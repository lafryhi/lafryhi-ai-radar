import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessingRunSchema, ReviewDecisionSchema, StoredAnalysisSchema } from "@/domain/schemas";
import { analysisFixture, sourceFixture } from "@/test/fixtures";
import { AnalysisFinalizationIntegrityError, type AnalysisFinalizationInput } from "./repository";

type FakeRef = { kind: "ref"; collection: string; id: string };
type FakeQuery = { kind: "query"; collection: string; field: string; value: unknown };
type FakeSnapshot = { exists: boolean; id: string; data: () => unknown };

const fake = vi.hoisted(() => ({
  db: null as unknown as {
    collections: Map<string, Map<string, unknown>>;
    failSetNumber: number | null;
    transactionOptions: unknown;
    collection(name: string): unknown;
    runTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T>;
  },
}));

vi.mock("@google-cloud/firestore", () => ({
  Firestore: class {
    constructor() {
      return fake.db;
    }
  },
}));

import { FirestoreRepository } from "./firestore";

function createFakeDb() {
  const collections = new Map<string, Map<string, unknown>>();
  const documents = (name: string) => {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name)!;
  };
  return {
    collections,
    failSetNumber: null as number | null,
    transactionOptions: null as unknown,
    collection(name: string) {
      return {
        doc(id: string): FakeRef {
          return { kind: "ref", collection: name, id };
        },
        where(field: string, _operator: string, value: unknown): FakeQuery {
          return { kind: "query", collection: name, field, value };
        },
      };
    },
    async runTransaction<T>(callback: (transaction: {
      get(target: FakeRef | FakeQuery): Promise<unknown>;
      set(reference: FakeRef, value: unknown): void;
    }) => Promise<T>, options?: unknown) {
      this.transactionOptions = options;
      const writes: Array<{ reference: FakeRef; value: unknown }> = [];
      let setCount = 0;
      const transaction = {
        async get(target: FakeRef | FakeQuery) {
          const values = documents(target.collection);
          if (target.kind === "ref") {
            const value = values.get(target.id);
            return {
              exists: value !== undefined,
              id: target.id,
              data: () => value,
            } satisfies FakeSnapshot;
          }
          const docs = [...values.entries()]
            .filter(([, value]) => (value as Record<string, unknown>)[target.field] === target.value)
            .map(([id, value]) => ({
              exists: true,
              id,
              data: () => value,
            } satisfies FakeSnapshot));
          return { docs, empty: docs.length === 0, size: docs.length };
        },
        set(reference: FakeRef, value: unknown) {
          setCount += 1;
          if (fake.db.failSetNumber === setCount) throw new Error("injected transaction write failure");
          writes.push({ reference, value });
        },
      };
      const result = await callback(transaction);
      writes.forEach(({ reference, value }) => documents(reference.collection).set(reference.id, value));
      return result;
    },
  };
}

function input(runId = "firestore-run"): AnalysisFinalizationInput {
  const processingRun = ProcessingRunSchema.parse({
    id: runId,
    sourceRecordId: sourceFixture.id,
    status: "pending_review",
    model: "deterministic-test-model",
    modelProvider: "vertex-ai",
    startedAt: "2026-07-27T00:00:00.000Z",
    completedAt: "2026-07-27T00:00:10.000Z",
    latencyMs: 10_000,
    promptVersion: "radar-decision-intelligence-v2",
    estimatedCostUsd: null,
    validationOutcome: "passed",
    errorDetails: null,
    retryCount: 0,
  });
  const analysis = StoredAnalysisSchema.parse({
    ...analysisFixture,
    id: `analysis-${runId}`,
    sourceRecordId: sourceFixture.id,
    processingRunId: runId,
    createdAt: "2026-07-27T00:00:10.000Z",
  });
  const pendingReview = ReviewDecisionSchema.parse({
    id: `review-${analysis.id}`,
    analysisResultId: analysis.id,
    status: "pending",
    reviewerNote: "",
    reviewedAt: null,
  });
  return { processingRun, analysis, pendingReview };
}

function processing(inputValue: AnalysisFinalizationInput) {
  return ProcessingRunSchema.parse({
    ...inputValue.processingRun,
    status: "processing",
    completedAt: null,
    latencyMs: null,
    validationOutcome: "not_run",
  });
}

function seed(inputValue: AnalysisFinalizationInput) {
  fake.db.collections.set("sourceRecords", new Map([[sourceFixture.id, sourceFixture]]));
  fake.db.collections.set("processingRuns", new Map([[inputValue.processingRun.id, processing(inputValue)]]));
}

describe("Firestore atomic analysis finalization", () => {
  beforeEach(() => {
    fake.db = createFakeDb();
  });

  it("commits all records and returns idempotently on repetition", async () => {
    const value = input();
    seed(value);
    const repository = new FirestoreRepository();
    expect(await repository.finalizeAnalysisForReview(value)).toMatchObject({ idempotent: false });
    expect(fake.db.collections.get("processingRuns")?.get(value.processingRun.id)).toEqual(value.processingRun);
    expect(fake.db.collections.get("analysisResults")?.get(value.analysis.id)).toEqual(value.analysis);
    expect(fake.db.collections.get("reviewDecisions")?.get(value.pendingReview.id)).toEqual(value.pendingReview);
    expect(fake.db.transactionOptions).toEqual({ maxAttempts: 1 });
    expect(await repository.finalizeAnalysisForReview(value)).toMatchObject({ idempotent: true });
  });

  it("rejects conflicting deterministic records", async () => {
    const value = input();
    seed(value);
    fake.db.collections.set("analysisResults", new Map([[
      value.analysis.id,
      { ...value.analysis, summary: "A conflicting valid summary that cannot overwrite the deterministic analysis." },
    ]]));
    await expect(new FirestoreRepository().finalizeAnalysisForReview(value))
      .rejects.toThrow(AnalysisFinalizationIntegrityError);
  });

  it.each([1, 2, 3])("commits no writes when conceptual transaction write %s fails", async (writeNumber) => {
    const value = input(`firestore-failure-${writeNumber}`);
    seed(value);
    fake.db.failSetNumber = writeNumber;
    await expect(new FirestoreRepository().finalizeAnalysisForReview(value))
      .rejects.toThrow("injected transaction write failure");
    expect(fake.db.collections.get("analysisResults")?.size ?? 0).toBe(0);
    expect(fake.db.collections.get("reviewDecisions")?.size ?? 0).toBe(0);
    expect(fake.db.collections.get("processingRuns")?.get(value.processingRun.id)).toEqual(processing(value));
  });
});
