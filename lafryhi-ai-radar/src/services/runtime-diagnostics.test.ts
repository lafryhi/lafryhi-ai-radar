import { describe, expect, it } from "vitest";
import { parseGeminiDiagnosticOutput, runRuntimeDiagnostic } from "./runtime-diagnostics";

describe("runtime diagnostics", () => {
  it("rejects malformed or schema-invalid Gemini diagnostic output", () => {
    expect(() => parseGeminiDiagnosticOutput("not-json")).toThrow("malformed JSON");
    expect(() => parseGeminiDiagnosticOutput(JSON.stringify({ status: "maybe", message: "not valid output" }))).toThrow();
  });

  it("returns a validated result from deterministic diagnostic dependencies", async () => {
    const result = await runRuntimeDiagnostic({
      async verifyFirestoreLifecycle() {
        return { writeReadVerified: true, deleteVerified: true, collectionEmpty: true };
      },
      async invokeVertexAi() {
        return {
          status: "ok",
          model: "gemini-test",
          region: "us-central1",
          latencyMs: 12,
          responseSummary: "Model returned the required minimal connectivity acknowledgement.",
        };
      },
    });

    expect(result.status).toBe("ok");
    expect(result.firestore.collectionEmpty).toBe(true);
    expect(result.vertexAi.model).toBe("gemini-test");
    expect(result.secretAccessValidated).toBe(true);
  });
});
