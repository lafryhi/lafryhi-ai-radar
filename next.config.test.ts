import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("Next.js Server Actions configuration", () => {
  it("allows only the local gcloud proxy origins", () => {
    const allowedOrigins = nextConfig.experimental?.serverActions?.allowedOrigins;

    expect(allowedOrigins).toEqual(["127.0.0.1:8080", "localhost:8080"]);
    expect(allowedOrigins).not.toContain("*");
  });
});
