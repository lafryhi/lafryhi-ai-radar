import { EvaluationDatasetSchema } from "./types";

export function validateEvaluationDataset(value: unknown) {
  return EvaluationDatasetSchema.parse(value);
}
