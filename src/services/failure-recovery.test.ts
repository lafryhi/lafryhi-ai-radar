import { describe, expect, it } from "vitest";
import {
  AnalysisFailure,
  aiRecoveryEnabled,
  classifyProviderFailure,
  decideRecovery,
  EmptyOutputFailure,
  EvidenceIntegrityFailure,
  ResponseEnvelopeFailure,
  ResponseTruncatedFailure,
  SchemaValidationFailure,
} from "./failure-recovery";

describe("analysis failure recovery policy", () => {
  it("uses typed failures with safe issue metadata", () => {
    const failure = new EvidenceIntegrityFailure([{ path: "evidence.0.quote", code: "quote_not_in_source" }]);
    expect(failure).toBeInstanceOf(AnalysisFailure);
    expect(failure.category).toBe("evidence_integrity");
    expect(failure.issues).toEqual([{ path: "evidence.0.quote", code: "quote_not_in_source" }]);
    expect(new ResponseEnvelopeFailure().category).toBe("response_envelope");
  });

  it("enables recovery only for the exact true value", () => {
    expect(aiRecoveryEnabled("true")).toBe(true);
    expect(aiRecoveryEnabled("false")).toBe(false);
    expect(aiRecoveryEnabled("TRUE")).toBe(false);
    expect(aiRecoveryEnabled("")).toBe(false);
  });

  it("uses a static typed recovery decision table", () => {
    expect(decideRecovery(new EmptyOutputFailure())).toBe("regenerate_compact");
    expect(decideRecovery(new ResponseTruncatedFailure())).toBe("regenerate_compact");
    expect(decideRecovery(new ResponseEnvelopeFailure())).toBe("regenerate_correction");
    expect(decideRecovery(new SchemaValidationFailure([]))).toBe("regenerate_correction");
    expect(decideRecovery(classifyProviderFailure({ status: 503 }, 0))).toBe("retry_identical");
    expect(decideRecovery(classifyProviderFailure({ status: 401 }, 0))).toBe("terminal");
  });

  it("classifies temporary nested network failures without reading dynamic prose", () => {
    const failure = classifyProviderFailure({
      name: "TypeError",
      message: "dynamic network prose",
      cause: { code: "ECONNRESET" },
    }, 0);
    expect(failure).toMatchObject({
      category: "provider_transient",
      providerStatus: null,
    });
  });
});
