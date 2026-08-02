import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { GeminiEvaluationConfig } from "../gemini-runtime-config";
import { validateEvaluationDataset } from "./dataset-validator";
import type { EvaluationCase } from "./types";
import { validateEvaluationEditorialPolicyContexts } from "./editorial-context";

function sampleValue(id: string) {
  return Number.parseInt(createHash("sha256").update(id).digest("hex").slice(0, 8), 16) / 0xffffffff;
}

export function selectEvaluationCases(
  cases: EvaluationCase[],
  config: Pick<GeminiEvaluationConfig, "sampleRate" | "maxCases">,
) {
  const sampled = cases.filter((item) => sampleValue(item.id) < config.sampleRate);
  return config.maxCases > 0 ? sampled.slice(0, config.maxCases) : sampled;
}

export async function loadEvaluationDataset(repositoryRoot: string, config: GeminiEvaluationConfig) {
  const path = resolve(repositoryRoot, config.datasetPath);
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  const dataset = validateEvaluationDataset(value);
  validateEvaluationEditorialPolicyContexts(dataset.cases.map((item) => item.id));
  return { ...dataset, cases: selectEvaluationCases(dataset.cases, config) };
}
