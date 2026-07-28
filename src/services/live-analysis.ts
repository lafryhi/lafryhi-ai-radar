import type {
  IntelligenceItem,
  MissionControlResponse,
  PipelineLogEntry,
} from "@/domain/mission-control";
import type { SourceRecord } from "@/domain/schemas";
import type { RadarRepository } from "@/persistence/repository";
import { z } from "zod";
import { VertexAiAnalyzer, type LiveAnalysisMetadata } from "./ai";
import { ingestSource } from "./ingestion";
import {
  LIVE_ANALYSIS_MAX_CONTENT_CHARS,
  LIVE_ANALYSIS_PROMPT_VERSION,
  LiveAnalysisOutputSchema,
  type LiveAnalysisPromptInput,
} from "./live-analysis-contract";

const MAX_CONCURRENCY = 2;
const MAX_RETRIES = 2;
const ITEM_TIMEOUT_MS = 60_000;

export interface LiveAnalysisSummary {
  attemptedItems: number;
  analyzedItems: number;
  skippedItems: number;
  failedItems: number;
  durationMs: number;
  model?: string;
  promptVersion?: string;
}

export interface LiveAnalysisResult {
  items: IntelligenceItem[];
  summary: LiveAnalysisSummary;
  logs: PipelineLogEntry[];
  status: MissionControlResponse["status"];
}

export interface LiveAnalysisProvider {
  analyzeLive(input: LiveAnalysisPromptInput): Promise<LiveAnalysisMetadata>;
}

export interface LiveAnalysisDependencies {
  provider?: LiveAnalysisProvider;
  createProvider?: () => LiveAnalysisProvider;
  materialize?: (
    item: IntelligenceItem,
    repository: RadarRepository,
  ) => Promise<SourceRecord>;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  concurrency?: number;
  timeoutMs?: number;
}

function logEntry(
  index: number,
  timestamp: string,
  level: PipelineLogEntry["level"],
  message: string,
): PipelineLogEntry {
  return {
    id: `live-analysis-log-${index + 1}`,
    timestamp,
    stage: "analyze",
    level,
    message,
  };
}

function safeCode(error: unknown) {
  if (error instanceof z.ZodError) return "ANALYSIS_OUTPUT_INVALID";

  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("timeout") || message.includes("timed out")) {
    return "ANALYSIS_TIMEOUT";
  }

  if (
    message.includes("malformed")
    || message.includes("json")
    || message.includes("schema")
  ) {
    return "ANALYSIS_OUTPUT_INVALID";
  }

  if (message.includes("evidence")) return "ANALYSIS_EVIDENCE_INVALID";

  if (message.includes("insufficient") || message.includes("short")) {
    return "ANALYSIS_INSUFFICIENT_CONTENT";
  }

  return "ANALYSIS_FAILED";
}

function isTransient(error: unknown) {
  const record =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};

  const status =
    typeof record.status === "number"
      ? record.status
      : typeof record.statusCode === "number"
        ? record.statusCode
        : null;

  const code =
    typeof record.code === "string" ? record.code.toUpperCase() : "";

  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    status === 408
    || status === 429
    || (status !== null && status >= 500)
    || [
      "ETIMEDOUT",
      "ECONNRESET",
      "EAI_AGAIN",
      "UNAVAILABLE",
      "RESOURCE_EXHAUSTED",
    ].includes(code)
    || /timeout|temporar|unavailable|rate limit/.test(message)
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Live analysis timed out.")),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function failedItem(
  item: IntelligenceItem,
  code: string,
  message: string,
): IntelligenceItem {
  return {
    ...item,
    analysisStatus: "failed",
    analysisErrorCode: code,
    analysisMessage: message,
    updatedAt: new Date().toISOString(),
  };
}

function skippedItem(
  item: IntelligenceItem,
  code: string,
  message: string,
): IntelligenceItem {
  return {
    ...item,
    analysisStatus: "skipped",
    analysisErrorCode: code,
    analysisMessage: message,
    updatedAt: new Date().toISOString(),
  };
}

function materializedInput(
  item: IntelligenceItem,
  source: SourceRecord,
  trustLevel: string,
): LiveAnalysisPromptInput {
  return {
    intelligenceItemId: item.id,
    sourceDefinitionId: item.sourceDefinitionId,
    sourceName: source.sourceName,
    sourceTrustLevel: trustLevel,
    articleUrl: source.sourceUrl,
    articleTitle: source.title,
    publicationDate: source.publishedAt,
    content: source.normalizedText.slice(0, LIVE_ANALYSIS_MAX_CONTENT_CHARS),
    evidenceIdentifiers: ["source-content", "source-metadata"],
  };
}

function applyAnalysis(
  item: IntelligenceItem,
  metadata: LiveAnalysisMetadata,
): IntelligenceItem {
  const output = LiveAnalysisOutputSchema.parse(metadata.result);
  const known = new Set(["source-content", "source-metadata"]);

  if (
    output.keyClaims.some((claim) =>
      claim.evidenceRefs.some((ref) => !known.has(ref)),
    )
  ) {
    throw new Error("Analysis output referenced unknown evidence.");
  }

  return {
    ...item,
    summary: output.summary,
    category: output.category,
    impactScore: output.impactScore,
    confidenceScore: output.confidenceScore,
    relevanceScore: output.relevanceScore,
    evidenceCount: new Set(
      output.keyClaims.flatMap((claim) => claim.evidenceRefs),
    ).size,
    keyClaims: output.keyClaims,
    impactRationale: output.impactRationale,
    confidenceRationale: output.confidenceRationale,
    limitations: output.limitations,
    analysisStatus: "completed",
    analysisModel: metadata.model,
    analysisPromptVersion: metadata.promptVersion,
    requiresHumanReview: true,
    analysisErrorCode: undefined,
    analysisMessage: undefined,
    updatedAt: new Date().toISOString(),
  };
}

async function analyzeOne(
  item: IntelligenceItem,
  repository: RadarRepository,
  provider: LiveAnalysisProvider,
  dependencies: LiveAnalysisDependencies,
): Promise<{
  item: IntelligenceItem;
  analyzed: boolean;
  skipped: boolean;
  model?: string;
  promptVersion?: string;
}> {
  if (!item.sourceUrl || !item.sourceDefinitionId) {
    return {
      item: skippedItem(
        item,
        "ANALYSIS_MISSING_TRACEABILITY",
        "Source traceability is insufficient for live analysis.",
      ),
      analyzed: false,
      skipped: true,
    };
  }

  const sourceDefinition = await repository.getSourceDefinition(
    item.sourceDefinitionId,
  );

  if (!sourceDefinition) {
    return {
      item: skippedItem(
        item,
        "ANALYSIS_SOURCE_UNAVAILABLE",
        "The registered source definition is unavailable.",
      ),
      analyzed: false,
      skipped: true,
    };
  }

  const materialize =
    dependencies.materialize
    ?? ((candidate: IntelligenceItem, repo: RadarRepository) =>
      ingestSource(candidate.sourceUrl ?? "", repo));

  let source: SourceRecord;

  try {
    source = await materialize(item, repository);
  } catch (error) {
    console.error("Live analysis materialization failed", {
      intelligenceItemId: item.id,
      sourceUrl: item.sourceUrl,
      errorMessage: error instanceof Error ? error.message : String(error),
      rawError: error,
    });

    return {
      item: skippedItem(
        item,
        "ANALYSIS_INSUFFICIENT_CONTENT",
        "Bounded source material was unavailable for analysis.",
      ),
      analyzed: false,
      skipped: true,
    };
  }

  if (source.normalizedText.trim().length < 200) {
    return {
      item: skippedItem(
        item,
        "ANALYSIS_INSUFFICIENT_CONTENT",
        "Source material is too short for safe analysis.",
      ),
      analyzed: false,
      skipped: true,
    };
  }

  const input = materializedInput(
    item,
    source,
    sourceDefinition.trustLevel,
  );

  let attempt = 0;

  while (true) {
    try {
      const result = await withTimeout(
        provider.analyzeLive(input),
        dependencies.timeoutMs ?? ITEM_TIMEOUT_MS,
      );

      return {
        item: applyAnalysis(item, result),
        analyzed: true,
        skipped: false,
        model: result.model,
        promptVersion: result.promptVersion,
      };
    } catch (error) {
      const errorCode = safeCode(error);

      console.error("Live analysis item failed", {
        intelligenceItemId: item.id,
        sourceUrl: item.sourceUrl,
        attempt,
        errorCode,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        rawError: error,
      });

      if (!isTransient(error) || attempt >= MAX_RETRIES) {
        return {
          item: failedItem(
            item,
            errorCode,
            error instanceof Error
              ? `Live analysis failed: ${error.message}`
              : "Live analysis failed safely; source data was preserved.",
          ),
          analyzed: false,
          skipped: false,
        };
      }

      attempt += 1;

      const sleep =
        dependencies.sleep
        ?? (async (milliseconds: number) =>
          new Promise<void>((resolve) =>
            setTimeout(resolve, milliseconds),
          ));

      await sleep(250 * (2 ** (attempt - 1)));
    }
  }
}

export async function analyzeLiveIntelligenceItems(
  repository: RadarRepository,
  items: IntelligenceItem[],
  dependencies: LiveAnalysisDependencies = {},
): Promise<LiveAnalysisResult> {
  const started = (dependencies.now ?? Date.now)();

  if (items.length === 0) {
    return {
      items: [],
      summary: {
        attemptedItems: 0,
        analyzedItems: 0,
        skippedItems: 0,
        failedItems: 0,
        durationMs: 0,
        promptVersion: LIVE_ANALYSIS_PROMPT_VERSION,
      },
      logs: [
        logEntry(
          0,
          new Date(started).toISOString(),
          "info",
          "No live records were collected; Vertex AI analysis was skipped.",
        ),
      ],
      status: "warning",
    };
  }

  let provider: LiveAnalysisProvider;

  try {
    provider =
      dependencies.provider
      ?? (dependencies.createProvider ?? (() => new VertexAiAnalyzer()))();
  } catch {
    return {
      items: items.map((item) =>
        failedItem(
          item,
          "ANALYSIS_PROVIDER_UNAVAILABLE",
          "Live analysis is unavailable; source data was preserved.",
        ),
      ),
      summary: {
        attemptedItems: items.length,
        analyzedItems: 0,
        skippedItems: 0,
        failedItems: items.length,
        durationMs: Math.max(
          0,
          (dependencies.now ?? Date.now)() - started,
        ),
        promptVersion: LIVE_ANALYSIS_PROMPT_VERSION,
      },
      logs: [
        logEntry(
          0,
          new Date(started).toISOString(),
          "error",
          "Live analysis provider is unavailable; no model request was made.",
        ),
      ],
      status: "error",
    };
  }

  const results: Array<
    Awaited<ReturnType<typeof analyzeOne>> | undefined
  > = new Array(items.length);

  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;

      results[index] = await analyzeOne(
        items[index],
        repository,
        provider,
        dependencies,
      );
    }
  };

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          Math.max(1, dependencies.concurrency ?? MAX_CONCURRENCY),
          items.length,
        ),
      },
      worker,
    ),
  );

  const resolved = results.map(
    (result) => result as Awaited<ReturnType<typeof analyzeOne>>,
  );

  const analyzedItems = resolved.filter((result) => result.analyzed).length;
  const skippedItems = resolved.filter((result) => result.skipped).length;
  const failedItems = resolved.length - analyzedItems - skippedItems;
  const durationMs = Math.max(
    0,
    (dependencies.now ?? Date.now)() - started,
  );

  const status: MissionControlResponse["status"] =
    failedItems === items.length
      ? "error"
      : failedItems || skippedItems
        ? "warning"
        : "success";

  const model = resolved.find((result) => result.model)?.model;
  const promptVersion =
    resolved.find((result) => result.promptVersion)?.promptVersion
    ?? LIVE_ANALYSIS_PROMPT_VERSION;

  const timestamp = new Date(started).toISOString();

  const logs: PipelineLogEntry[] = [
    logEntry(
      0,
      timestamp,
      "info",
      `Analyzing ${items.length} live records with Vertex AI...`,
    ),
    logEntry(
      1,
      timestamp,
      status === "success" ? "success" : status,
      `${analyzedItems} analyzed, ${skippedItems} skipped, ${failedItems} failed.`,
    ),
  ];

  return {
    items: resolved.map((result) => result.item),
    summary: {
      attemptedItems: items.length,
      analyzedItems,
      skippedItems,
      failedItems,
      durationMs,
      ...(model ? { model } : {}),
      promptVersion,
    },
    logs,
    status,
  };
}
