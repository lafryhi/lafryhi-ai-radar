import { randomUUID } from "node:crypto";
import { z } from "zod";
import { digest } from "./crypto.js";
import { SERVICE_ID, SERVICE_VERSION } from "./contracts.js";

export const APPROVED_DECISION_BRIEF_ID =
  "9351c44b-390e-4337-b8b6-d820a8df7fb2";
export const APPROVED_SIGNAL_ID =
  "radar-analysis-4868af19-4aa5-4f50-aed0-0297784dd92f";
export const APPROVED_ARTIFACT_VERSION = 1;
export const APPROVED_CONTENT_DIGEST =
  "554e5451421640b0bc550efeaf4f49321e17c8a3289e69e1cb2ac6e5d6066c30";
export const APPROVED_QUOTE_NETWORK = "eip155:5042002";
export const QUOTE_AMOUNT = "0.01";

export const DecisionBriefQuoteRequestSchema = z.strictObject({
  requestId: z
    .string()
    .trim()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
  decisionBriefId: z.literal(APPROVED_DECISION_BRIEF_ID),
  buyerAgentReference: z
    .string()
    .trim()
    .min(3)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
});
export type DecisionBriefQuoteRequest = z.infer<
  typeof DecisionBriefQuoteRequestSchema
>;

export interface ApprovedBriefReference {
  id: string;
  signalId: string;
  artifactVersion: number;
}
export interface QuoteSourcePort {
  findBrief(id: string): Promise<ApprovedBriefReference | null>;
  findPublishedRadarItem(id: string): Promise<{ title: string } | null>;
}
export interface QuoteResponse {
  quoteId: string;
  requestId: string;
  serviceId: typeof SERVICE_ID;
  serviceVersion: typeof SERVICE_VERSION;
  decisionBriefId: string;
  title: string;
  artifactVersion: number;
  contentDigest: string;
  amount: typeof QUOTE_AMOUNT;
  currency: "USDC";
  network: string;
  sellerAddress: string;
  expiresAt: string;
}
export interface StoredQuote {
  state: "ISSUED";
  requestFingerprint: string;
  buyerAgentReference: string;
  quote: QuoteResponse;
  createdAt: string;
  expiresAt: string;
}
export type QuoteClaim =
  | { kind: "created" | "existing"; record: StoredQuote }
  | { kind: "conflict" | "expired" };
export interface QuoteStorePort {
  claim(
    requestId: string,
    proposed: StoredQuote,
    now: Date,
  ): Promise<QuoteClaim>;
}

export interface QuoteConfig {
  network?: string | undefined;
  sellerAddress?: string | undefined;
  contentDigest?: string | undefined;
  ttlMilliseconds?: number;
}

export class QuoteError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

export async function issueDecisionBriefQuote(
  request: DecisionBriefQuoteRequest,
  source: QuoteSourcePort,
  store: QuoteStorePort,
  config: QuoteConfig,
  now = new Date(),
): Promise<QuoteResponse> {
  const network = config.network?.trim();
  const sellerAddress = config.sellerAddress?.trim();
  const configuredDigest = config.contentDigest?.trim().toLowerCase();
  if (!network || network !== APPROVED_QUOTE_NETWORK)
    throw new QuoteError("QUOTE_TESTNET_CONFIGURATION_INVALID", 503);
  if (!sellerAddress) throw new QuoteError("SELLER_ADDRESS_MISSING", 503);
  if (!/^0x[a-fA-F0-9]{40}$/.test(sellerAddress))
    throw new QuoteError("SELLER_ADDRESS_INVALID", 503);
  if (configuredDigest !== APPROVED_CONTENT_DIGEST)
    throw new QuoteError("ARTIFACT_DIGEST_MISMATCH", 503);

  const brief = await source.findBrief(request.decisionBriefId);
  if (!brief) throw new QuoteError("DECISION_BRIEF_NOT_FOUND", 404);
  if (
    brief.id !== APPROVED_DECISION_BRIEF_ID ||
    brief.signalId !== APPROVED_SIGNAL_ID ||
    brief.artifactVersion !== APPROVED_ARTIFACT_VERSION
  )
    throw new QuoteError("DECISION_BRIEF_NOT_APPROVED", 409);
  const publishedItem = await source.findPublishedRadarItem(APPROVED_SIGNAL_ID);
  if (!publishedItem) throw new QuoteError("SOURCE_NOT_PUBLISHED", 409);

  const ttl = config.ttlMilliseconds ?? 5 * 60_000;
  if (!Number.isSafeInteger(ttl) || ttl < 1_000 || ttl > 15 * 60_000)
    throw new QuoteError("QUOTE_EXPIRY_CONFIGURATION_INVALID", 503);
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttl).toISOString();
  const quote: QuoteResponse = {
    quoteId: randomUUID(),
    requestId: request.requestId,
    serviceId: SERVICE_ID,
    serviceVersion: SERVICE_VERSION,
    decisionBriefId: brief.id,
    title: publishedItem.title,
    artifactVersion: APPROVED_ARTIFACT_VERSION,
    contentDigest: APPROVED_CONTENT_DIGEST,
    amount: QUOTE_AMOUNT,
    currency: "USDC",
    network,
    sellerAddress,
    expiresAt,
  };
  const requestFingerprint = digest(request);
  const claim = await store.claim(
    request.requestId,
    {
      state: "ISSUED",
      requestFingerprint,
      buyerAgentReference: request.buyerAgentReference,
      quote,
      createdAt,
      expiresAt,
    },
    now,
  );
  if (claim.kind === "conflict")
    throw new QuoteError("QUOTE_REQUEST_CONFLICT", 409);
  if (claim.kind === "expired")
    throw new QuoteError("QUOTE_REQUEST_EXPIRED", 409);
  if (claim.kind === "created" || claim.kind === "existing")
    return claim.record.quote;
  throw new QuoteError("QUOTE_SERVICE_UNAVAILABLE", 503);
}

export class InMemoryQuoteStore implements QuoteStorePort {
  private readonly records = new Map<string, StoredQuote>();
  async claim(requestId: string, proposed: StoredQuote, now: Date) {
    const existing = this.records.get(requestId);
    if (existing) {
      if (existing.requestFingerprint !== proposed.requestFingerprint)
        return { kind: "conflict" as const };
      if (Date.parse(existing.expiresAt) <= now.getTime())
        return { kind: "expired" as const };
      return { kind: "existing" as const, record: existing };
    }
    this.records.set(requestId, proposed);
    return { kind: "created" as const, record: proposed };
  }
}
