import { createHash } from "node:crypto";
import { z } from "zod";
import { parsePhase5Contract, Phase5ContractValidationError } from "./validation-error";

export const CANONICAL_URL_NORMALIZATION_VERSION = "phase5-canonical-url-v1" as const;
const MAX_URL_LENGTH = 4096;

const trackingParameters = new Set([
  "dclid",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "utm_campaign",
  "utm_content",
  "utm_id",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

export const CanonicalUrlDecisionSchema = z.enum([
  "DEFAULT_PORT_REMOVED",
  "DOT_SEGMENTS_RESOLVED",
  "EMPTY_PATH_NORMALIZED",
  "FRAGMENT_REMOVED",
  "HOST_NORMALIZED",
  "QUERY_ORDER_NORMALIZED",
  "TRACKING_PARAMETER_REMOVED",
]);

export const CanonicalUrlWarningSchema = z.enum([
  "INTERNATIONALIZED_HOST_SERIALIZED",
  "NON_DEFAULT_PORT_PRESERVED",
  "TRAILING_SLASH_PRESERVED",
  "UNKNOWN_QUERY_PARAMETER_PRESERVED",
]);

export const RemovedQueryParameterSchema = z.object({
  classification: z.literal("APPROVED_TRACKING_PARAMETER"),
  name: z.enum([
    "dclid", "fbclid", "gclid", "mc_cid", "mc_eid", "msclkid",
    "utm_campaign", "utm_content", "utm_id", "utm_medium", "utm_source", "utm_term",
  ]),
  count: z.number().int().min(1).max(64),
}).strict();

export const CanonicalUrlResultSchema = z.object({
  version: z.literal(CANONICAL_URL_NORMALIZATION_VERSION),
  status: z.literal("NORMALIZED"),
  originalUrlDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  normalizedUrl: z.string().min(1).max(MAX_URL_LENGTH),
  host: z.string().min(1).max(253),
  normalizedPath: z.string().min(1).max(2048),
  retainedQueryParameters: z.array(z.object({
    name: z.string().max(256),
    value: z.string().max(2048),
  }).strict()).max(128),
  removedQueryParameters: z.array(RemovedQueryParameterSchema).max(12),
  decisions: z.array(CanonicalUrlDecisionSchema).max(16),
  warnings: z.array(CanonicalUrlWarningSchema).max(16),
}).strict();

export type CanonicalUrlResult = z.infer<typeof CanonicalUrlResultSchema>;
export type CanonicalUrlDecision = z.infer<typeof CanonicalUrlDecisionSchema>;
export type CanonicalUrlWarning = z.infer<typeof CanonicalUrlWarningSchema>;

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(path: string): never {
  throw new Phase5ContractValidationError([{ code: "invalid_url", path }]);
}

function parseUrl(original: string): URL {
  try {
    return new URL(original);
  } catch {
    return fail("url");
  }
}

export function normalizeCanonicalUrl(input: unknown): CanonicalUrlResult {
  const original = parsePhase5Contract(z.string().min(1).max(MAX_URL_LENGTH), input);
  if (/[\u0000-\u001F\u007F]/u.test(original)) fail("url");
  const parsed = parseUrl(original);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") fail("url.scheme");
  if (parsed.username !== "" || parsed.password !== "") fail("url.credentials");
  if (parsed.hostname === "") fail("url.host");

  const decisions = new Set<CanonicalUrlDecision>();
  const warnings = new Set<CanonicalUrlWarning>();
  const inputHost = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/iu.exec(original)?.[1] ?? "";
  const hostWithoutPort = inputHost.replace(/:\d+$/u, "");

  if (hostWithoutPort !== parsed.hostname) decisions.add("HOST_NORMALIZED");
  if (/[^\u0000-\u007F]/u.test(hostWithoutPort)) warnings.add("INTERNATIONALIZED_HOST_SERIALIZED");
  if ((parsed.protocol === "http:" && /:80$/u.test(inputHost))
    || (parsed.protocol === "https:" && /:443$/u.test(inputHost))) {
    decisions.add("DEFAULT_PORT_REMOVED");
  }
  if (parsed.port !== "") warnings.add("NON_DEFAULT_PORT_PRESERVED");
  if (parsed.hash !== "") {
    parsed.hash = "";
    decisions.add("FRAGMENT_REMOVED");
  }

  const rawPath = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/iu.exec(original)?.[1] ?? "";
  if (rawPath === "") decisions.add("EMPTY_PATH_NORMALIZED");
  if (/(?:^|\/)\.{1,2}(?:\/|$)/u.test(rawPath)) decisions.add("DOT_SEGMENTS_RESOLVED");
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    warnings.add("TRAILING_SLASH_PRESERVED");
  }

  const retained: Array<{ name: string; value: string; index: number }> = [];
  const removedCounts = new Map<string, number>();
  for (const [name, value] of parsed.searchParams.entries()) {
    const normalizedName = name.toLowerCase();
    if (trackingParameters.has(normalizedName)) {
      removedCounts.set(normalizedName, (removedCounts.get(normalizedName) ?? 0) + 1);
      decisions.add("TRACKING_PARAMETER_REMOVED");
    } else {
      retained.push({ name, value, index: retained.length });
      if (/(?:source|ref|campaign|tracking)/iu.test(name)) {
        warnings.add("UNKNOWN_QUERY_PARAMETER_PRESERVED");
      }
    }
  }

  const ordered = [...retained].sort((left, right) => {
    const byName = compareCodePoints(left.name, right.name);
    return byName === 0 ? left.index - right.index : byName;
  });
  if (ordered.some((entry, position) => entry.index !== retained[position]?.index)) {
    decisions.add("QUERY_ORDER_NORMALIZED");
  }

  parsed.search = "";
  for (const entry of ordered) parsed.searchParams.append(entry.name, entry.value);

  const result = {
    version: CANONICAL_URL_NORMALIZATION_VERSION,
    status: "NORMALIZED" as const,
    originalUrlDigest: `sha256:${createHash("sha256").update(original, "utf8").digest("hex")}`,
    normalizedUrl: parsed.toString(),
    host: parsed.host,
    normalizedPath: parsed.pathname,
    retainedQueryParameters: ordered.map(({ name, value }) => ({ name, value })),
    removedQueryParameters: [...removedCounts.entries()]
      .sort(([left], [right]) => compareCodePoints(left, right))
      .map(([name, count]) => ({
        classification: "APPROVED_TRACKING_PARAMETER" as const,
        name,
        count,
      })),
    decisions: [...decisions].sort(compareCodePoints),
    warnings: [...warnings].sort(compareCodePoints),
  };
  return parsePhase5Contract(CanonicalUrlResultSchema, result);
}

export const APPROVED_TRACKING_PARAMETERS = Object.freeze([...trackingParameters].sort(compareCodePoints));
