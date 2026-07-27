import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const moduleDirectory = fileURLToPath(new URL(".", import.meta.url));
const productionFiles = readdirSync(moduleDirectory)
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .sort();

const prohibitedImports = [
  /from\s+["']@google-cloud\//,
  /from\s+["']@google\/genai["']/,
  /from\s+["']next(?:\/|["'])/,
  /from\s+["']@\/(?:app|auth|persistence|services)\//,
  /from\s+["']node:(?:fs|child_process|http|https|net|tls|dgram|dns)/,
  /from\s+["'](?:firebase|firebase-admin|undici|axios|node-fetch)["']/,
];

const prohibitedCapabilities = [
  /\bprocess\.env\b/,
  /\bDate\.now\s*\(/,
  /\bMath\.random\s*\(/,
  /\brandomUUID\s*\(/,
  /\bconsole\.(?:log|info|warn|error|debug)\s*\(/,
  /\bfetch\s*\(/,
  /\bnew\s+WebSocket\s*\(/,
  /\b(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\s*\(/,
  /\b(?:execFile|spawn|fork)\s*\(/,
  /^\s*(?:let|var)\s+/m,
];

describe("Phase 5.1 pure-module boundary", () => {
  it("contains only the approved production module set", () => {
    expect(productionFiles).toEqual([
      "artifact-envelope.ts",
      "canonical-url.ts",
      "corpus-manifest.ts",
      "exact-duplicate.ts",
      "identifiers.ts",
      "index.ts",
      "provenance.ts",
      "qualification.ts",
      "source-fingerprint.ts",
      "source-normalization.ts",
      "utc-time.ts",
      "validation-error.ts",
    ]);
  });

  it("does not import production, provider, persistence, network, or filesystem capabilities", () => {
    for (const file of productionFiles) {
      const source = readFileSync(`${moduleDirectory}/${file}`, "utf8");
      for (const pattern of prohibitedImports) {
        expect(source, `${file} matched prohibited import ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("does not use implicit clocks, randomness, secrets, logging, writes, processes, or mutable state", () => {
    for (const file of productionFiles) {
      const source = readFileSync(`${moduleDirectory}/${file}`, "utf8");
      for (const pattern of prohibitedCapabilities) {
        expect(source, `${file} matched prohibited capability ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
