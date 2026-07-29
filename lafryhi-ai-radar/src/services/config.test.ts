import { afterEach, describe, expect, it } from "vitest";
import { VertexAiAnalyzer } from "./ai";

const previous = { ...process.env };
afterEach(() => { process.env = { ...previous }; });

describe("Vertex AI runtime limits", () => {
  it("rejects unsafe timeout and output limits before making a call", () => {
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    process.env.VERTEX_TIMEOUT_MS = "999";
    expect(() => new VertexAiAnalyzer()).toThrow("VERTEX_TIMEOUT_MS");
    process.env.VERTEX_TIMEOUT_MS = "60000";
    process.env.GEMINI_MAX_OUTPUT_TOKENS = "9999";
    expect(() => new VertexAiAnalyzer()).toThrow("GEMINI_MAX_OUTPUT_TOKENS");
  });
});
