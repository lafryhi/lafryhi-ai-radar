import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { SERVICE_ID, SERVICE_VERSION } from "./contracts.js";

export const PROOF_V1 = {
  requestId: "operator-f45e0737-cb3c-4fef-b960-dc9cc7f6b25f",
  quoteId: "cd733488-7fc8-4763-a4f7-927f3e88cd90",
  decisionBriefId: "9351c44b-390e-4337-b8b6-d820a8df7fb2",
  signalId: "radar-analysis-4868af19-4aa5-4f50-aed0-0297784dd92f",
  artifactVersion: 1,
  contentDigest:
    "554e5451421640b0bc550efeaf4f49321e17c8a3289e69e1cb2ac6e5d6066c30",
  artifactBytes: 6487,
  authorizationReference:
    "authorization-operator-f45e0737-cb3c-4fef-b960-dc9cc7f6b25f",
  circleTransactionId: "e92b6d6c-3fb6-57a5-9119-7c8e12570ab5",
  transactionHash:
    "0x0f8bdc2111cde8c225db947e78e089630e133be2f877b0fb0d1f4b043b37a99b",
  network: "ARC-TESTNET",
  quoteNetwork: "eip155:5042002",
  tokenId: "ef87c8c3-85de-598a-af50-c5135eecfa74",
  buyer: "0x344b6fef1a35e1c5fa6795d12676b39e99af5900",
  seller: "0xb1fcfc3bb86a11128414d692c21d3c511aed4247",
  amount: "0.01",
  currency: "USDC",
} as const;

export const ProofV1FulfillmentRequestSchema = z.strictObject({
  requestId: z.literal(PROOF_V1.requestId),
  quoteId: z.literal(PROOF_V1.quoteId),
  decisionBriefId: z.literal(PROOF_V1.decisionBriefId),
  artifactVersion: z.literal(PROOF_V1.artifactVersion),
  contentDigest: z.literal(PROOF_V1.contentDigest),
  authorizationReference: z.literal(PROOF_V1.authorizationReference),
  circleTransactionId: z.literal(PROOF_V1.circleTransactionId),
  transactionHash: z.literal(PROOF_V1.transactionHash),
});
export type ProofV1FulfillmentRequest = z.infer<
  typeof ProofV1FulfillmentRequestSchema
>;

const claim = z.strictObject({
  text: z.string().min(1),
  evidenceIds: z.array(z.string()).min(1),
});
const evidence = z.strictObject({
  id: z.string(),
  excerpt: z.string(),
  significance: z.string(),
  sourceTitle: z.string(),
  sourcePublisher: z.string(),
  sourceUrl: z.string().url(),
  sourceRecordId: z.string(),
  sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export const ProofV1ArtifactSchema = z.strictObject({
  artifactVersion: z.literal(1),
  decisionBriefId: z.literal(PROOF_V1.decisionBriefId),
  signalId: z.literal(PROOF_V1.signalId),
  createdAt: z.string().datetime(),
  title: z.string().min(1),
  decisionQuestion: z.string().min(1),
  recommendedPosition: z.literal("RUN_EXPERIMENT"),
  recommendedAction: z.string().min(1),
  confidence: z.number(),
  score: z.strictObject({
    signalImportance: z.number(),
    evidenceConfidence: z.number(),
    businessApplicability: z.number(),
    urgency: z.number(),
    expectedImpact: z.number(),
    decisionScore: z.number(),
  }),
  expectedBenefits: z.array(claim),
  potentialRisks: z.array(claim),
  estimatedEffort: z.strictObject({
    level: z.literal("MEDIUM"),
    rationale: z.string(),
    supportingEvidenceIds: z.array(z.string()),
  }),
  successCriteria: z.array(z.string()),
  reconsiderationTriggers: z.array(z.string()),
  supportingEvidence: z.array(evidence),
});

const forbidden = new Set([
  "ownerId",
  "businessProfileId",
  "businessName",
  "businessContextSnapshot",
  "budget",
  "budgetRange",
  "riskTolerance",
  "currentTools",
  "anonymousSessionData",
  "prompt",
  "prompts",
  "rawModelResponse",
  "rawModelResponses",
  "credential",
  "credentials",
  "unpublishedSourceText",
]);
export function assertProofV1Privacy(value: unknown): void {
  if (Array.isArray(value)) return value.forEach(assertProofV1Privacy);
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (forbidden.has(key))
      throw new ProofV1Error("PRIVATE_ARTIFACT_FIELD", 503);
    assertProofV1Privacy(item);
  }
}

export interface ProofV1QuoteRecord {
  requestId: string;
  quoteId: string;
  decisionBriefId: string;
  artifactVersion: number;
  contentDigest: string;
  amount: string;
  currency: string;
  network: string;
  sellerAddress: string;
}
export interface CircleSettlement {
  id: string;
  transactionHash: string;
  state: string;
  network: string;
  amount: string;
  currency: string;
  tokenId: string;
  buyer: string;
  seller: string;
}
export interface ProofV1FulfillmentResponse {
  fulfillmentId: string;
  serviceId: typeof SERVICE_ID;
  serviceVersion: typeof SERVICE_VERSION;
  requestId: string;
  quoteId: string;
  decisionBriefId: string;
  artifactVersion: 1;
  contentDigest: string;
  authorizationReference: string;
  circleTransactionId: string;
  transactionHash: string;
  settlementMechanism: "CIRCLE_DEVELOPER_WALLET_TESTNET";
  artifactBase64: string;
  fulfilledAt: string;
}
export interface ProofV1Ports {
  quote: { find(requestId: string): Promise<ProofV1QuoteRecord | null> };
  circle: { find(transactionId: string): Promise<CircleSettlement> };
  artifact: { load(): Promise<Buffer> };
  store: {
    claim(
      transactionId: string,
      fingerprint: string,
      response: ProofV1FulfillmentResponse,
    ): Promise<
      | { kind: "created" | "existing"; response: ProofV1FulfillmentResponse }
      | { kind: "conflict" }
    >;
  };
  now?: () => Date;
}
export class ProofV1Error extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
function same(actual: unknown, expected: unknown, code: string): void {
  if (actual !== expected) throw new ProofV1Error(code, 409);
}

export async function fulfillProofV1(
  request: ProofV1FulfillmentRequest,
  ports: ProofV1Ports,
): Promise<ProofV1FulfillmentResponse> {
  const quote = await ports.quote.find(request.requestId);
  if (!quote) throw new ProofV1Error("QUOTE_NOT_FOUND", 404);
  for (const [actual, expected] of [
    [quote.requestId, request.requestId],
    [quote.quoteId, request.quoteId],
    [quote.decisionBriefId, request.decisionBriefId],
    [quote.artifactVersion, request.artifactVersion],
    [quote.contentDigest, request.contentDigest],
    [quote.amount, PROOF_V1.amount],
    [quote.currency, PROOF_V1.currency],
    [quote.network, PROOF_V1.quoteNetwork],
    [quote.sellerAddress.toLowerCase(), PROOF_V1.seller],
  ] as const)
    same(actual, expected, "QUOTE_CORRELATION_MISMATCH");
  const settlement = await ports.circle.find(request.circleTransactionId);
  for (const [actual, expected] of [
    [settlement.id, PROOF_V1.circleTransactionId],
    [settlement.transactionHash.toLowerCase(), PROOF_V1.transactionHash],
    [settlement.state, "COMPLETE"],
    [settlement.network, PROOF_V1.network],
    [settlement.amount, PROOF_V1.amount],
    [settlement.currency, PROOF_V1.currency],
    [settlement.tokenId, PROOF_V1.tokenId],
    [settlement.buyer.toLowerCase(), PROOF_V1.buyer],
    [settlement.seller.toLowerCase(), PROOF_V1.seller],
  ] as const)
    same(actual, expected, "SETTLEMENT_MISMATCH");
  const raw = await ports.artifact.load();
  same(raw.byteLength, PROOF_V1.artifactBytes, "ARTIFACT_BYTES_MISMATCH");
  same(
    createHash("sha256").update(raw).digest("hex"),
    PROOF_V1.contentDigest,
    "ARTIFACT_DIGEST_MISMATCH",
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  } catch {
    throw new ProofV1Error("ARTIFACT_INVALID", 503);
  }
  if (!ProofV1ArtifactSchema.safeParse(parsed).success)
    throw new ProofV1Error("ARTIFACT_INVALID", 503);
  assertProofV1Privacy(parsed);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex");
  const response: ProofV1FulfillmentResponse = {
    fulfillmentId: `proof-v1-${request.circleTransactionId}`,
    serviceId: SERVICE_ID,
    serviceVersion: SERVICE_VERSION,
    ...request,
    settlementMechanism: "CIRCLE_DEVELOPER_WALLET_TESTNET",
    artifactBase64: raw.toString("base64"),
    fulfilledAt: (ports.now ?? (() => new Date()))().toISOString(),
  };
  const result = await ports.store.claim(
    request.circleTransactionId,
    fingerprint,
    response,
  );
  if (result.kind === "conflict")
    throw new ProofV1Error("FULFILLMENT_CONFLICT", 409);
  return result.response;
}

export class FrozenProofV1ArtifactLoader {
  constructor(
    private readonly path = resolve(
      process.cwd(),
      "proof-v1-decision-brief-artifact.json",
    ),
  ) {}
  load(): Promise<Buffer> {
    return readFile(this.path);
  }
}
export class CircleReadOnlySettlementVerifier {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  async find(transactionId: string): Promise<CircleSettlement> {
    if (transactionId !== PROOF_V1.circleTransactionId)
      throw new ProofV1Error("SETTLEMENT_MISMATCH", 409);
    const response = await this.fetcher(
      `https://api.circle.com/v1/w3s/transactions/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        redirect: "error",
      },
    );
    if (!response.ok) throw new ProofV1Error("SETTLEMENT_UNAVAILABLE", 503);
    const body = z
      .object({
        data: z.object({
          transaction: z.object({
            id: z.string(),
            txHash: z.string(),
            state: z.string(),
            blockchain: z.string(),
            amounts: z.tuple([z.string()]),
            tokenId: z.string(),
            sourceAddress: z.string(),
            destinationAddress: z.string(),
          }),
        }),
      })
      .parse(await response.json());
    const t = body.data.transaction;
    return {
      id: t.id,
      transactionHash: t.txHash,
      state: t.state,
      network: t.blockchain,
      amount: t.amounts[0],
      currency: "USDC",
      tokenId: t.tokenId,
      buyer: t.sourceAddress,
      seller: t.destinationAddress,
    };
  }
}
