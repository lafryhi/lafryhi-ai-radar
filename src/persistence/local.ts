import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { ProcessingRunSchema, RadarItemSchema, ReviewDecisionSchema, RssCandidateSchema, RssDiscoveryRunSchema, SourceDefinitionSchema, SourceRecordSchema, StoredAnalysisSchema } from "@/domain/schemas";
import { MemoryRepository } from "./memory";

const LocalDataSchema = z.object({
  sourceDefinitions: z.array(SourceDefinitionSchema).default([]),
  rssCandidates: z.array(RssCandidateSchema).default([]),
  rssDiscoveryRuns: z.array(RssDiscoveryRunSchema).default([]),
  sources: z.array(SourceRecordSchema),
  runs: z.array(ProcessingRunSchema),
  analyses: z.array(StoredAnalysisSchema),
  reviews: z.array(ReviewDecisionSchema),
  items: z.array(RadarItemSchema),
});

export class LocalFileRepository extends MemoryRepository {
  private loaded = false;
  constructor(private readonly path: string) { super(); }

  private async load() {
    if (this.loaded) return;
    try {
      const data = LocalDataSchema.parse(JSON.parse(await readFile(this.path, "utf8")));
      data.sourceDefinitions.forEach((x) => this.sourceDefinitions.set(x.id, x));
      data.rssCandidates.forEach((x) => this.rssCandidates.set(x.id, x));
      data.rssDiscoveryRuns.forEach((x) => this.rssDiscoveryRuns.set(x.id, x));
      data.sources.forEach((x) => this.sources.set(x.id, x));
      data.runs.forEach((x) => this.runs.set(x.id, x));
      data.analyses.forEach((x) => this.analyses.set(x.id, x));
      data.reviews.forEach((x) => this.reviews.set(x.id, x));
      data.items.forEach((x) => this.items.set(x.id, x));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    this.loaded = true;
  }

  private async flush() {
    await mkdir(dirname(this.path), { recursive: true });
    const temp = `${this.path}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify({
      sourceDefinitions: [...this.sourceDefinitions.values()],
      rssCandidates: [...this.rssCandidates.values()],
      rssDiscoveryRuns: [...this.rssDiscoveryRuns.values()],
      sources: [...this.sources.values()], runs: [...this.runs.values()],
      analyses: [...this.analyses.values()], reviews: [...this.reviews.values()],
      items: [...this.items.values()],
    }, null, 2));
    await rename(temp, this.path);
  }

  override async getSourceDefinition(id: string) { await this.load(); return super.getSourceDefinition(id); }
  override async findSourceDefinitionByDomain(domain: string) { await this.load(); return super.findSourceDefinitionByDomain(domain); }
  override async saveSourceDefinition(v: Parameters<MemoryRepository["saveSourceDefinition"]>[0]) { await this.load(); await super.saveSourceDefinition(v); await this.flush(); }
  override async listSourceDefinitions(limit?: number) { await this.load(); return super.listSourceDefinitions(limit); }
  override async countSourceDefinitions() { await this.load(); return super.countSourceDefinitions(); }
  override async getRssCandidate(id: string) { await this.load(); return super.getRssCandidate(id); }
  override async findRssCandidateByUrl(normalizedUrl: string) { await this.load(); return super.findRssCandidateByUrl(normalizedUrl); }
  override async findRssCandidateByFeedId(sourceDefinitionId: string, feedItemIdHash: string) { await this.load(); return super.findRssCandidateByFeedId(sourceDefinitionId, feedItemIdHash); }
  override async saveRssCandidate(v: Parameters<MemoryRepository["saveRssCandidate"]>[0]) { await this.load(); await super.saveRssCandidate(v); await this.flush(); }
  override async listRssCandidates(sourceDefinitionId: string, limit?: number) { await this.load(); return super.listRssCandidates(sourceDefinitionId, limit); }
  override async saveRssDiscoveryRun(v: Parameters<MemoryRepository["saveRssDiscoveryRun"]>[0]) { await this.load(); await super.saveRssDiscoveryRun(v); await this.flush(); }
  override async listRssDiscoveryRuns(sourceDefinitionId?: string, limit?: number) { await this.load(); return super.listRssDiscoveryRuns(sourceDefinitionId, limit); }
  override async findSourceByUrl(normalizedUrl: string) { await this.load(); return super.findSourceByUrl(normalizedUrl); }
  override async findSourceByHash(hash: string) { await this.load(); return super.findSourceByHash(hash); }
  override async getSource(id: string) { await this.load(); return super.getSource(id); }
  override async saveSource(v: Parameters<MemoryRepository["saveSource"]>[0]) { await this.load(); await super.saveSource(v); await this.flush(); }
  override async listSources(limit?: number) { await this.load(); return super.listSources(limit); }
  override async getRun(id: string) { await this.load(); return super.getRun(id); }
  override async saveRun(v: Parameters<MemoryRepository["saveRun"]>[0]) { await this.load(); await super.saveRun(v); await this.flush(); }
  override async listRuns(limit?: number) { await this.load(); return super.listRuns(limit); }
  override async saveAnalysis(v: Parameters<MemoryRepository["saveAnalysis"]>[0]) { await this.load(); await super.saveAnalysis(v); await this.flush(); }
  override async getAnalysis(id: string) { await this.load(); return super.getAnalysis(id); }
  override async listAnalyses(limit?: number) { await this.load(); return super.listAnalyses(limit); }
  override async saveReview(v: Parameters<MemoryRepository["saveReview"]>[0]) { await this.load(); await super.saveReview(v); await this.flush(); }
  override async getReviewForAnalysis(id: string) { await this.load(); return super.getReviewForAnalysis(id); }
  override async listReviews(limit?: number) { await this.load(); return super.listReviews(limit); }
  override async saveRadarItem(v: Parameters<MemoryRepository["saveRadarItem"]>[0]) { await this.load(); await super.saveRadarItem(v); await this.flush(); }
  override async findRadarItemByAnalysis(id: string) { await this.load(); return super.findRadarItemByAnalysis(id); }
  override async listPublishedItems(limit?: number) { await this.load(); return super.listPublishedItems(limit); }
  override async getOperatorCounts() { await this.load(); return super.getOperatorCounts(); }
}
