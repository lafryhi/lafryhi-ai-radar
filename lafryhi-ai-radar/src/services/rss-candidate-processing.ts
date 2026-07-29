import { RssCandidateSchema } from "@/domain/schemas";
import type { RadarRepository } from "@/persistence/repository";
import type { AiAnalyzer } from "./ai";
import { runPipeline } from "./pipeline";

export class RssCandidateProcessingError extends Error {
  constructor(message: string, readonly statusCode: 400 | 404 | 409) { super(message); }
}

export async function processRssCandidate(repository: RadarRepository, analyzer: AiAnalyzer, candidateId: string, fetcher: typeof fetch = fetch) {
  const candidate = await repository.getRssCandidate(candidateId);
  if (!candidate) throw new RssCandidateProcessingError("Candidate not found.", 404);
  if (candidate.status === "processed") return { candidate, sourceRecordId: candidate.sourceRecordId, idempotent: true };
  const source = await repository.getSourceDefinition(candidate.sourceDefinitionId);
  if (!source) throw new RssCandidateProcessingError("Registered source not found.", 404);
  const result = await runPipeline(candidate.articleUrl, repository, analyzer, fetcher, { candidateId: candidate.id });
  const processed = RssCandidateSchema.parse({ ...candidate, status: "processed", sourceRecordId: result.source.id, processedAt: new Date().toISOString() });
  await repository.saveRssCandidate(processed);
  return { candidate: processed, sourceRecordId: result.source.id, idempotent: false };
}
