import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";
import {
  RssCandidateSchema,
  RssDiscoveryRunSchema,
  type RssDiscoveryRun,
  type SourceDefinition,
} from "@/domain/schemas";
import { matchesAllowedDomain } from "@/domain/domain-policy";
import type { RadarRepository } from "@/persistence/repository";
import { TRUSTED_SOURCE_LEVELS } from "./source-management";
import { logRssEvent } from "./rss-events";

export const RSS_LIMITS = {
  maxSources: 10,
  maxFeedBytes: 512 * 1024,
  maxRedirects: 3,
  timeoutMs: 10_000,
  maxItemsPerFeed: 50,
  maxAcceptedPerSource: 10,
  maxCandidatesPerRun: 25,
} as const;

type Resolver = (hostname: string) => Promise<string[]>;

export type FeedItem = {
  title: string;
  articleUrl: string;
  publishedAt: string | null;
  feedItemId: string | null;
  summary: string | null;
};

export type DiscoveryDependencies = {
  fetcher?: typeof fetch;
  resolver?: Resolver;
};

export class RssDiscoveryError extends Error {
  constructor(
    message: string,
    readonly category: RssDiscoveryRun["errorCategories"][number],
    readonly reason:
      | "ineligible_source"
      | "missing_feed"
      | "unsafe_url"
      | "fetch_failed"
      | "unsupported_content"
      | "oversized_feed"
      | "malformed_feed"
      | "outside_domain",
  ) {
    super(message);
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeArticleUrl(input: string) {
  const url = new URL(input);

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new RssDiscoveryError(
      "Discovered URL is unsafe.",
      "unsafe_url",
      "unsafe_url",
    );
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  if (url.port === "443") {
    url.port = "";
  }

  return url.toString();
}

function unsafeIpv4(value: string) {
  const p = value.split(".").map(Number);

  return (
    p[0] === 0 ||
    p[0] === 10 ||
    p[0] === 127 ||
    p[0] >= 224 ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && (p[1] === 0 || p[1] === 168)) ||
    (p[0] === 198 &&
      (p[1] === 18 ||
        p[1] === 19 ||
        (p[1] === 51 && p[2] === 100))) ||
    (p[0] === 203 && p[1] === 0 && p[2] === 113)
  );
}

function unsafeIp(value: string) {
  if (isIP(value) === 4) {
    return unsafeIpv4(value);
  }

  const normalized = value.toLowerCase();

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8")
  );
}

async function productionResolver(hostname: string) {
  const [v4, v6] = await Promise.all([
    resolve4(hostname).catch(() => []),
    resolve6(hostname).catch(() => []),
  ]);

  return [...v4, ...v6];
}

export async function validateNetworkTarget(
  url: URL,
  canonicalDomain: string,
  additionalDomains: string[] = [],
  resolver: Resolver = productionResolver,
) {
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    isIP(url.hostname) ||
    url.hostname === "localhost" ||
    !matchesAllowedDomain(
      url.hostname,
      canonicalDomain,
      additionalDomains,
    )
  ) {
    throw new RssDiscoveryError(
      "Feed target is unsafe.",
      "unsafe_url",
      "unsafe_url",
    );
  }

  const addresses = await resolver(url.hostname);

  if (!addresses.length || addresses.some(unsafeIp)) {
    throw new RssDiscoveryError(
      "Feed target did not resolve to a safe public address.",
      "unsafe_url",
      "unsafe_url",
    );
  }
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function text(value: string) {
  return decodeXml(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, names: string[]) {
  for (const name of names) {
    const match = block.match(
      new RegExp(
        `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,
        "i",
      ),
    );

    if (match) {
      return text(match[1]);
    }
  }

  return "";
}

function atomLink(block: string) {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)];

  for (const match of links) {
    const attrs = match[1];
    const rel = attrs.match(/\brel=["']([^"']+)["']/i)?.[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];

    if (href && (!rel || rel === "alternate")) {
      return decodeXml(href);
    }
  }

  return "";
}

function parsedDate(value: string) {
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime())
    ? date.toISOString()
    : null;
}

export function parseFeed(xml: string): FeedItem[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new RssDiscoveryError(
      "DTD and entity declarations are not supported.",
      "malformed_feed",
      "malformed_feed",
    );
  }

  const isAtom = /<feed\b/i.test(xml);
  const isRss = /<rss\b|<channel\b/i.test(xml);

  if (!isAtom && !isRss) {
    throw new RssDiscoveryError(
      "Feed format is not RSS 2.0 or Atom.",
      "malformed_feed",
      "malformed_feed",
    );
  }

  const blocks = [
    ...xml.matchAll(
      isAtom
        ? /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
        : /<item\b[^>]*>([\s\S]*?)<\/item>/gi,
    ),
  ].slice(0, RSS_LIMITS.maxItemsPerFeed);

  if (!blocks.length) {
    throw new RssDiscoveryError(
      "Feed contains no parseable items.",
      "malformed_feed",
      "malformed_feed",
    );
  }

  return blocks.map((match) => {
    const block = match[1];

    return {
      title: tag(block, ["title"]).slice(0, 300),
      articleUrl: isAtom
        ? atomLink(block)
        : tag(block, ["link"]),
      publishedAt: parsedDate(
        tag(
          block,
          isAtom
            ? ["published", "updated"]
            : ["pubDate", "date"],
        ),
      ),
      feedItemId:
        tag(block, isAtom ? ["id"] : ["guid"]) || null,
      summary:
        tag(
          block,
          isAtom
            ? ["summary", "content"]
            : ["description", "content:encoded"],
        ).slice(0, 500) || null,
    };
  });
}

async function fetchFeed(
  source: SourceDefinition,
  dependencies: DiscoveryDependencies,
) {
  if (!source.rssUrl) {
    throw new RssDiscoveryError(
      "Source has no configured feed.",
      "missing_feed",
      "missing_feed",
    );
  }

  const fetcher = dependencies.fetcher ?? fetch;
  const resolver = dependencies.resolver ?? productionResolver;
  let current = new URL(source.rssUrl);

  for (
    let redirects = 0;
    redirects <= RSS_LIMITS.maxRedirects;
    redirects += 1
  ) {
    await validateNetworkTarget(
      current,
      source.canonicalDomain,
      source.allowedFeedDomains,
      resolver,
    );

    const response = await fetcher(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(RSS_LIMITS.timeoutMs),
      headers: {
        "user-agent": "LAFRYHI-AI-Radar-RSS/1.0",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (
        !location ||
        redirects === RSS_LIMITS.maxRedirects
      ) {
        throw new RssDiscoveryError(
          "Feed redirect limit exceeded.",
          "fetch_failed",
          "fetch_failed",
        );
      }

      current = new URL(location, current);
      continue;
    }

    if (!response.ok) {
      throw new RssDiscoveryError(
        "Feed retrieval failed.",
        "fetch_failed",
        "fetch_failed",
      );
    }

    const contentType = (
      response.headers.get("content-type") || ""
    ).toLowerCase();

    if (
      ![
        "application/rss+xml",
        "application/atom+xml",
        "application/xml",
        "text/xml",
      ].some((value) => contentType.includes(value))
    ) {
      throw new RssDiscoveryError(
        "Feed content type is unsupported.",
        "unsupported_content",
        "unsupported_content",
      );
    }

    const length = Number(
      response.headers.get("content-length") || "0",
    );

    if (length > RSS_LIMITS.maxFeedBytes) {
      throw new RssDiscoveryError(
        "Feed exceeds the size limit.",
        "oversized_feed",
        "oversized_feed",
      );
    }

    const xml = await response.text();

    if (
      Buffer.byteLength(xml, "utf8") >
      RSS_LIMITS.maxFeedBytes
    ) {
      throw new RssDiscoveryError(
        "Feed exceeds the size limit.",
        "oversized_feed",
        "oversized_feed",
      );
    }

    return parseFeed(xml);
  }

  throw new RssDiscoveryError(
    "Feed retrieval failed.",
    "fetch_failed",
    "fetch_failed",
  );
}

function eligible(source: SourceDefinition) {
  return (
    source.status === "enabled" &&
    TRUSTED_SOURCE_LEVELS.includes(
      source.trustLevel as typeof TRUSTED_SOURCE_LEVELS[number],
    )
  );
}

function emptyRun(
  trigger: "manual" | "scheduled",
  sourceDefinitionId: string | null,
): RssDiscoveryRun {
  return RssDiscoveryRunSchema.parse({
    id: randomUUID(),
    trigger,
    sourceDefinitionId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "running",
    sourcesConsidered: 0,
    feedsSucceeded: 0,
    feedsFailed: 0,
    itemsExamined: 0,
    candidatesAccepted: 0,
    duplicates: 0,
    skippedItems: 0,
    validationFailures: 0,
    errorCategories: [],
  });
}

function addCategory(
  run: RssDiscoveryRun,
  category: RssDiscoveryRun["errorCategories"][number],
) {
  return run.errorCategories.includes(category)
    ? run.errorCategories
    : [...run.errorCategories, category].slice(0, 10);
}

export async function discoverRss(
  repository: RadarRepository,
  trigger: "manual" | "scheduled",
  sourceDefinitionId?: string,
  dependencies: DiscoveryDependencies = {},
) {
  let run = emptyRun(
    trigger,
    sourceDefinitionId ?? null,
  );

  await repository.saveRssDiscoveryRun(run);

  logRssEvent({
    event: "rss.discovery_started",
    runId: run.id,
    trigger,
    status: "running",
  });

  const sources = sourceDefinitionId
    ? [
        await repository.getSourceDefinition(
          sourceDefinitionId,
        ),
      ].filter(
        (source): source is SourceDefinition =>
          Boolean(source),
      )
    : (
        await repository.listSourceDefinitions(
          RSS_LIMITS.maxSources,
        )
      ).slice(0, RSS_LIMITS.maxSources);

  const seenUrls = new Set<string>();
  const seenFeedIds = new Set<string>();

  for (const source of sources) {
    if (
      run.candidatesAccepted >=
      RSS_LIMITS.maxCandidatesPerRun
    ) {
      break;
    }

    run = {
      ...run,
      sourcesConsidered:
        run.sourcesConsidered + 1,
    };

    logRssEvent({
      event: "rss.source_started",
      runId: run.id,
      sourceDefinitionId: source.id,
      trigger,
    });

    if (!eligible(source)) {
      run = {
        ...run,
        skippedItems: run.skippedItems + 1,
        validationFailures:
          run.validationFailures + 1,
        errorCategories: addCategory(
          run,
          "ineligible_source",
        ),
      };

      logRssEvent({
        event: "rss.source_skipped",
        runId: run.id,
        sourceDefinitionId: source.id,
        reason: "ineligible_source",
      });

      continue;
    }

    if (!source.rssUrl) {
      run = {
        ...run,
        skippedItems: run.skippedItems + 1,
        errorCategories: addCategory(
          run,
          "missing_feed",
        ),
      };

      logRssEvent({
        event: "rss.source_skipped",
        runId: run.id,
        sourceDefinitionId: source.id,
        reason: "missing_feed",
      });

      continue;
    }

    try {
      const items = await fetchFeed(
        source,
        dependencies,
      );

      run = {
        ...run,
        feedsSucceeded: run.feedsSucceeded + 1,
      };

      let acceptedForSource = 0;

      for (const item of items) {
        run = {
          ...run,
          itemsExamined: run.itemsExamined + 1,
        };

        if (
          acceptedForSource >=
            RSS_LIMITS.maxAcceptedPerSource ||
          run.candidatesAccepted >=
            RSS_LIMITS.maxCandidatesPerRun
        ) {
          run = {
            ...run,
            skippedItems: run.skippedItems + 1,
          };

          logRssEvent({
            event: "rss.item_rejected",
            runId: run.id,
            sourceDefinitionId: source.id,
            reason: "bounded_limit",
          });

          continue;
        }

        try {
          if (!item.title || !item.articleUrl) {
            throw new RssDiscoveryError(
              "Feed item is missing required metadata.",
              "malformed_feed",
              "malformed_feed",
            );
          }

          const normalizedUrl = normalizeArticleUrl(
            new URL(item.articleUrl, source.rssUrl).toString(),
          );

          const articleHostname = new URL(normalizedUrl).hostname;

          console.log("========== RSS DOMAIN CHECK ==========");
          console.log("Article URL:", normalizedUrl);
          console.log("Article Host:", articleHostname);
          console.log("Canonical Domain:", source.canonicalDomain);
          console.log(
            "Allowed Article Domains:",
            source.allowedArticleDomains,
          );
          console.log("======================================");

          if (
            !matchesAllowedDomain(
              articleHostname,
              source.canonicalDomain,
              source.allowedArticleDomains,
            )
          ) {
            console.error("RSS article rejected outside domain:", {
              articleUrl: normalizedUrl,
              articleHostname,
              canonicalDomain: source.canonicalDomain,
              allowedArticleDomains: source.allowedArticleDomains,
            });

            throw new RssDiscoveryError(
              "Article URL is outside the source domain.",
              "unsafe_url",
              "outside_domain",
            );
          }

          const feedHash = item.feedItemId
            ? hash(item.feedItemId)
            : null;

          const duplicateUrl =
            seenUrls.has(normalizedUrl) ||
            Boolean(
              await repository.findSourceByUrl(
                normalizedUrl,
              ),
            ) ||
            Boolean(
              await repository.findRssCandidateByUrl(
                normalizedUrl,
              ),
            );

          const duplicateFeed =
            Boolean(feedHash) &&
            (seenFeedIds.has(
              `${source.id}:${feedHash}`,
            ) ||
              Boolean(
                await repository.findRssCandidateByFeedId(
                  source.id,
                  feedHash as string,
                ),
              ));

          if (duplicateUrl || duplicateFeed) {
            run = {
              ...run,
              duplicates: run.duplicates + 1,
            };

            logRssEvent({
              event: "rss.item_duplicate",
              runId: run.id,
              sourceDefinitionId: source.id,
              reason: duplicateUrl
                ? "duplicate_url"
                : "duplicate_feed_id",
            });

            continue;
          }

          const candidate =
            RssCandidateSchema.parse({
              id: hash(
                `${source.id}:${normalizedUrl}`,
              ),
              sourceDefinitionId: source.id,
              discoveryRunId: run.id,
              title: item.title,
              articleUrl: normalizedUrl,
              normalizedUrl,
              publishedAt: item.publishedAt,
              feedItemIdHash: feedHash,
              summary: item.summary,
              publisher: source.publisher,
              discoveredAt:
                new Date().toISOString(),
              status: "pending",
              sourceRecordId: null,
              processedAt: null,
            });

          await repository.saveRssCandidate(
            candidate,
          );

          seenUrls.add(normalizedUrl);

          if (feedHash) {
            seenFeedIds.add(
              `${source.id}:${feedHash}`,
            );
          }

          acceptedForSource += 1;

          run = {
            ...run,
            candidatesAccepted:
              run.candidatesAccepted + 1,
          };

          logRssEvent({
            event: "rss.item_accepted",
            runId: run.id,
            sourceDefinitionId: source.id,
            candidateId: candidate.id,
          });
        } catch (error) {
          console.error(
            "RSS candidate rejection:",
            error,
          );

          run = {
            ...run,
            skippedItems: run.skippedItems + 1,
            validationFailures:
              run.validationFailures + 1,
          };

          logRssEvent(
            {
              event: "rss.item_rejected",
              runId: run.id,
              sourceDefinitionId: source.id,
              reason:
                error instanceof
                  RssDiscoveryError &&
                error.reason === "outside_domain"
                  ? "outside_domain"
                  : "unsafe_url",
            },
            "warn",
          );
        }
      }

      logRssEvent({
        event: "rss.source_completed",
        runId: run.id,
        sourceDefinitionId: source.id,
        itemsExamined: run.itemsExamined,
        candidatesAccepted:
          run.candidatesAccepted,
        duplicates: run.duplicates,
        skippedItems: run.skippedItems,
        validationFailures:
          run.validationFailures,
      });
    } catch (error) {
      const rssError =
        error instanceof RssDiscoveryError
          ? error
          : new RssDiscoveryError(
              "Feed retrieval failed.",
              "fetch_failed",
              "fetch_failed",
            );

      run = {
        ...run,
        feedsFailed: run.feedsFailed + 1,
        validationFailures:
          run.validationFailures + 1,
        errorCategories: addCategory(
          run,
          rssError.category,
        ),
      };

      const event =
        rssError.category === "malformed_feed"
          ? "rss.feed_parse_failed"
          : rssError.category === "fetch_failed"
            ? "rss.feed_fetch_failed"
            : "rss.feed_validation_failed";

      logRssEvent(
        {
          event,
          runId: run.id,
          sourceDefinitionId: source.id,
          reason: rssError.reason,
        },
        "warn",
      );
    }
  }

  const status =
    !sources.length ||
    (!run.feedsSucceeded && !run.feedsFailed)
      ? "skipped"
      : run.feedsFailed && run.feedsSucceeded
        ? "partial"
        : run.feedsFailed
          ? "failed"
          : "success";

  run = RssDiscoveryRunSchema.parse({
    ...run,
    status,
    completedAt: new Date().toISOString(),
  });

  await repository.saveRssDiscoveryRun(run);

  logRssEvent({
    event: "rss.discovery_completed",
    runId: run.id,
    trigger,
    status,
    sourcesConsidered: run.sourcesConsidered,
    itemsExamined: run.itemsExamined,
    candidatesAccepted: run.candidatesAccepted,
    duplicates: run.duplicates,
    skippedItems: run.skippedItems,
    validationFailures: run.validationFailures,
  });

  return run;
}
