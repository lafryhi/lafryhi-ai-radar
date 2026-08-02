import { createHash } from "node:crypto";
import { z } from "zod";

export const FORBIDDEN_TERM_DETECTOR_VERSION = "forbidden-term-detector-v1";
export const TEXT_NORMALIZATION_VERSION = "editorial-text-normalization-v1";

export const ForbiddenTermSettingsSchema = z.object({
  detectorVersion: z.literal(FORBIDDEN_TERM_DETECTOR_VERSION),
  normalizationVersion: z.literal(TEXT_NORMALIZATION_VERSION),
  accentInsensitive: z.boolean(),
  boundaryMode: z.literal("TOKEN"),
  locale: z.literal("und"),
  acceptedAlternatives: z.record(z.string(), z.array(z.string().min(1))).default({}),
}).strict();

export type ForbiddenTermSettings = z.infer<typeof ForbiddenTermSettingsSchema>;

export const DEFAULT_FORBIDDEN_TERM_SETTINGS: ForbiddenTermSettings = Object.freeze({
  detectorVersion: FORBIDDEN_TERM_DETECTOR_VERSION,
  normalizationVersion: TEXT_NORMALIZATION_VERSION,
  accentInsensitive: true,
  boundaryMode: "TOKEN",
  locale: "und",
  acceptedAlternatives: {},
});

export interface ForbiddenTermDetection {
  configuredTerm: string;
  configuredTermId: string;
  normalizedTerm: string;
  fieldName: string;
  startToken: number;
  endToken: number;
}

export interface ForbiddenTermAdjudication {
  checkedFieldNames: string[];
  normalizedDetectedTerms: string[];
  configuredTermIds: string[];
  detections: ForbiddenTermDetection[];
  detectionCount: number;
  fieldFingerprints: Record<string, string>;
  normalizedTokenCount: number;
  detectorVersion: string;
  normalizationVersion: string;
  policyRuleId: "EP-006";
}

export function normalizeForbiddenText(value: string, settings: ForbiddenTermSettings = DEFAULT_FORBIDDEN_TERM_SETTINGS) {
  const parsed = ForbiddenTermSettingsSchema.parse(settings);
  let normalized = value
    .replace(/[‘’‚‛′`´]/gu, "'")
    .replace(/[‐‑‒–—―−]/gu, "-")
    .normalize(parsed.accentInsensitive ? "NFKD" : "NFKC");
  if (parsed.accentInsensitive) normalized = normalized.replace(/\p{M}/gu, "");
  return normalized
    .toLocaleLowerCase("und")
    .replace(/['-]+/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function tokens(value: string, settings: ForbiddenTermSettings) {
  const normalized = normalizeForbiddenText(value, settings);
  return { normalized, tokens: normalized ? normalized.split(" ") : [] };
}

function termId(normalizedTerm: string) {
  return `FT-${createHash("sha256").update(normalizedTerm).digest("hex").slice(0, 12)}`;
}

export function validateForbiddenTermConfiguration(
  configuredTerms: string[],
  settings: ForbiddenTermSettings = DEFAULT_FORBIDDEN_TERM_SETTINGS,
) {
  const parsed = ForbiddenTermSettingsSchema.parse(settings);
  const normalized = configuredTerms.map((term) => {
    if (!term.trim()) throw new Error("Forbidden terms must not be empty.");
    return normalizeForbiddenText(term, parsed);
  });
  if (normalized.some((term) => !term)) throw new Error("Forbidden terms must contain at least one token.");
  if (new Set(normalized).size !== normalized.length) throw new Error("Forbidden terms must be unique after normalization.");
  for (let left = 0; left < normalized.length; left += 1) {
    for (let right = left + 1; right < normalized.length; right += 1) {
      const a = ` ${normalized[left]} `;
      const b = ` ${normalized[right]} `;
      if (a.includes(b) || b.includes(a)) throw new Error("Overlapping forbidden phrase definitions are not supported.");
    }
  }
  for (const [term, alternatives] of Object.entries(parsed.acceptedAlternatives)) {
    const normalizedTerm = normalizeForbiddenText(term, parsed);
    if (!normalized.includes(normalizedTerm)) throw new Error("Accepted alternatives must reference a configured forbidden term.");
    const normalizedAlternatives = alternatives.map((alternative) => normalizeForbiddenText(alternative, parsed));
    if (normalizedAlternatives.some((alternative) => normalized.includes(alternative))) {
      throw new Error("Accepted alternatives must not conflict with configured forbidden terms.");
    }
  }
  return { terms: configuredTerms, normalizedTerms: normalized, settings: parsed };
}

export function detectForbiddenTermsInFields(
  fields: Record<string, string>,
  configuredTerms: string[],
  settings: ForbiddenTermSettings = DEFAULT_FORBIDDEN_TERM_SETTINGS,
): ForbiddenTermAdjudication {
  const configuration = validateForbiddenTermConfiguration(configuredTerms, settings);
  const checkedFieldNames = Object.keys(fields).sort();
  const detections: ForbiddenTermDetection[] = [];
  const fieldFingerprints: Record<string, string> = {};
  let normalizedTokenCount = 0;
  for (const fieldName of checkedFieldNames) {
    const field = tokens(fields[fieldName], configuration.settings);
    normalizedTokenCount += field.tokens.length;
    fieldFingerprints[fieldName] = createHash("sha256").update(fields[fieldName]).digest("hex");
    configuration.terms.forEach((configuredTerm, termIndex) => {
      const phrase = configuration.normalizedTerms[termIndex].split(" ");
      for (let start = 0; start <= field.tokens.length - phrase.length; start += 1) {
        if (phrase.every((token, offset) => field.tokens[start + offset] === token)) {
          detections.push({
            configuredTerm,
            configuredTermId: termId(configuration.normalizedTerms[termIndex]),
            normalizedTerm: configuration.normalizedTerms[termIndex],
            fieldName,
            startToken: start,
            endToken: start + phrase.length - 1,
          });
        }
      }
    });
  }
  return {
    checkedFieldNames,
    normalizedDetectedTerms: [...new Set(detections.map((item) => item.normalizedTerm))],
    configuredTermIds: [...new Set(configuration.normalizedTerms.map(termId))],
    detections,
    detectionCount: detections.length,
    fieldFingerprints,
    normalizedTokenCount,
    detectorVersion: configuration.settings.detectorVersion,
    normalizationVersion: configuration.settings.normalizationVersion,
    policyRuleId: "EP-006",
  };
}
