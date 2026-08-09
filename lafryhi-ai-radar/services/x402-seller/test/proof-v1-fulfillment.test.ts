import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  CircleReadOnlySettlementVerifier,
  fulfillProofV1,
  PROOF_V1,
  ProofV1FulfillmentRequestSchema,
  type CircleSettlement,
  type ProofV1FulfillmentResponse,
  type ProofV1Ports,
  type ProofV1QuoteRecord,
} from "../src/proof-v1-fulfillment.js";

const request = {
  requestId: PROOF_V1.requestId,
  quoteId: PROOF_V1.quoteId,
  decisionBriefId: PROOF_V1.decisionBriefId,
  artifactVersion: 1 as const,
  contentDigest: PROOF_V1.contentDigest,
  authorizationReference: PROOF_V1.authorizationReference,
  circleTransactionId: PROOF_V1.circleTransactionId,
  transactionHash: PROOF_V1.transactionHash,
};
const quote: ProofV1QuoteRecord = {
  requestId: PROOF_V1.requestId,
  quoteId: PROOF_V1.quoteId,
  decisionBriefId: PROOF_V1.decisionBriefId,
  artifactVersion: 1,
  contentDigest: PROOF_V1.contentDigest,
  amount: "0.01",
  currency: "USDC",
  network: "eip155:5042002",
  sellerAddress: PROOF_V1.seller,
};
const settlement: CircleSettlement = {
  id: PROOF_V1.circleTransactionId,
  transactionHash: PROOF_V1.transactionHash,
  state: "COMPLETE",
  network: "ARC-TESTNET",
  amount: "0.01",
  currency: "USDC",
  tokenId: PROOF_V1.tokenId,
  buyer: PROOF_V1.buyer,
  seller: PROOF_V1.seller,
};
const artifact = () =>
  readFile(
    new URL("../proof-v1-decision-brief-artifact.json", import.meta.url),
  );

function ports(
  overrides: {
    quote?: Partial<ProofV1QuoteRecord>;
    settlement?: Partial<CircleSettlement>;
    bytes?: Buffer;
  } = {},
): ProofV1Ports {
  const records = new Map<
    string,
    { fingerprint: string; response: ProofV1FulfillmentResponse }
  >();
  return {
    quote: { find: async () => ({ ...quote, ...overrides.quote }) },
    circle: { find: async () => ({ ...settlement, ...overrides.settlement }) },
    artifact: { load: async () => overrides.bytes ?? artifact() },
    now: () => new Date("2026-08-09T12:00:00.000Z"),
    store: {
      claim: async (id, fingerprint, response) => {
        const old = records.get(id);
        if (!old) {
          records.set(id, { fingerprint, response });
          return { kind: "created", response };
        }
        return old.fingerprint === fingerprint
          ? { kind: "existing", response: old.response }
          : { kind: "conflict" };
      },
    },
  };
}

describe("Proof v1 fulfillment", () => {
  it("delivers the exact frozen bytes for the verified settlement", async () => {
    const result = await fulfillProofV1(request, ports());
    expect(Buffer.from(result.artifactBase64, "base64")).toEqual(
      await artifact(),
    );
    expect(result).toMatchObject({
      contentDigest: PROOF_V1.contentDigest,
      settlementMechanism: "CIRCLE_DEVELOPER_WALLET_TESTNET",
    });
  });
  it.each([
    ["wrong quote", { quoteId: "wrong" }, {}],
    ["wrong digest", { contentDigest: "wrong" }, {}],
    ["wrong amount", { amount: "1.00" }, {}],
    ["wrong seller quote", { sellerAddress: PROOF_V1.buyer }, {}],
    ["wrong tx hash", {}, { transactionHash: `0x${"1".repeat(64)}` }],
    ["wrong token", {}, { tokenId: "wrong" }],
    ["wrong buyer", {}, { buyer: PROOF_V1.seller }],
    ["wrong seller", {}, { seller: PROOF_V1.buyer }],
    ["wrong network", {}, { network: "ETH-SEPOLIA" }],
    ["non-COMPLETE", {}, { state: "CONFIRMED" }],
  ])("rejects %s", async (_name, quoteOverride, settlementOverride) => {
    await expect(
      fulfillProofV1(
        request,
        ports({ quote: quoteOverride, settlement: settlementOverride }),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("rejects wrong transaction requests and unknown fields", () => {
    expect(
      ProofV1FulfillmentRequestSchema.safeParse({
        ...request,
        circleTransactionId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      ProofV1FulfillmentRequestSchema.safeParse({ ...request, topic: "AI" })
        .success,
    ).toBe(false);
  });
  it("rejects corrupted frozen bytes before parsing", async () => {
    const bytes = await artifact();
    bytes[10] = (bytes[10] ?? 0) ^ 1;
    await expect(
      fulfillProofV1(request, ports({ bytes })),
    ).rejects.toMatchObject({ code: "ARTIFACT_DIGEST_MISMATCH" });
  });
  it("returns the identical fulfillment on replay and rejects conflicting reuse", async () => {
    const shared = ports();
    const first = await fulfillProofV1(request, shared);
    expect(await fulfillProofV1(request, shared)).toEqual(first);
    await expect(
      shared.store.claim(PROOF_V1.circleTransactionId, "conflict", first),
    ).resolves.toEqual({ kind: "conflict" });
  });
  it("contains no private fields", async () => {
    const result = await fulfillProofV1(request, ports());
    expect(Buffer.from(result.artifactBase64, "base64").toString()).not.toMatch(
      /ownerId|businessProfileId|businessContextSnapshot|currentTools|riskTolerance/,
    );
  });
  it("Circle verifier can only issue GET transaction lookup", async () => {
    const fetcher = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) =>
        Response.json({
          data: {
            transaction: {
              id: settlement.id,
              txHash: settlement.transactionHash,
              state: settlement.state,
              blockchain: settlement.network,
              amounts: [settlement.amount],
              tokenId: settlement.tokenId,
              sourceAddress: settlement.buyer,
              destinationAddress: settlement.seller,
            },
          },
        }),
    );
    await new CircleReadOnlySettlementVerifier(
      "test-key",
      fetcher as typeof fetch,
    ).find(PROOF_V1.circleTransactionId);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("GET");
  });
});
