import { describe, expect, it } from "vitest";
import {
  AnalysisFailure,
  aiRecoveryEnabled,
  EvidenceIntegrityFailure,
  ResponseEnvelopeFailure,
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
});
