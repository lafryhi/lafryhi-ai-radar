import { describe, expect, it } from "vitest";
import { fingerprintSourceBody, normalizeSourceContent } from "./index";

const SAMPLE_COUNT = 1000;
const WARM_COUNT = 100;
const generatedAt = "2026-07-27T12:00:00.000Z";
const digest = "a".repeat(64);

const bands = [
  { name: "small", bytes: 4 * 1024, ceilingMs: 2 },
  { name: "medium", bytes: 64 * 1024, ceilingMs: 10 },
  { name: "large", bytes: 512 * 1024, ceilingMs: 50 },
] as const;

function input(body: string) {
  return {
    artifactId: `p5-artifact:v1:fixture:${digest}`,
    generatedAt,
    provenance: {
      contractVersion: "phase5-provenance-v1",
      sourceRecordId: "source-record-performance",
      parentArtifactIds: [],
      transformation: { identifier: "phase5.performance", version: "v1" },
      contentDigest: { algorithm: "sha256", digest },
      generatedAt,
      producerIdentity: "phase5-performance-test",
      derivationReason: "test_fixture",
      correctionLineage: [],
      supersessionLineage: [],
    },
    title: "Synthetic performance fixture",
    body,
    languageHint: "en",
  };
}

function operation(value: ReturnType<typeof input>): string {
  const normalized = normalizeSourceContent(value);
  return fingerprintSourceBody(normalized.document.body.digestInput).id;
}

function percentile95(samples: readonly number[]): number {
  const ordered = [...samples].sort((left, right) => left - right);
  return ordered[Math.ceil(ordered.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY;
}

describe("Phase 5.1B pure-operation provisional latency", () => {
  for (const band of bands) {
    it(`${band.name} normalization and fingerprint p95 stays within provisional ceiling`, () => {
      const value = input("x".repeat(band.bytes));
      Array.from({ length: WARM_COUNT }).forEach(() => operation(value));
      const samples = Array.from({ length: SAMPLE_COUNT }, () => {
        const start = performance.now();
        operation(value);
        return performance.now() - start;
      });
      const p95 = percentile95(samples);
      expect(p95, `${band.name} p95=${p95.toFixed(3)}ms samples=${SAMPLE_COUNT}`).toBeLessThanOrEqual(band.ceilingMs);
    }, 30_000);
  }
});
