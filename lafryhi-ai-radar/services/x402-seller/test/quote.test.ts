import { describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import {
  APPROVED_CONTENT_DIGEST,
  APPROVED_DECISION_BRIEF_ID,
  APPROVED_QUOTE_NETWORK,
  APPROVED_SIGNAL_ID,
  DecisionBriefQuoteRequestSchema,
  InMemoryQuoteStore,
  issueDecisionBriefQuote,
  type QuoteConfig,
  type QuoteSourcePort,
} from "../src/quote.js";
import { createApp } from "../src/server.js";
import { FixtureRadarContentAdapter } from "../src/content.js";
import { FakePaymentVerifier } from "../src/payment.js";
import { InMemoryFulfillmentRepository } from "../src/repository.js";
import { FirestoreQuoteSource } from "../src/firestore-quote.js";

const now = new Date("2026-08-08T12:00:00.000Z");
const request = {
  requestId: "request-0001",
  decisionBriefId: APPROVED_DECISION_BRIEF_ID,
  buyerAgentReference: "buyer-agent-001",
} as const;
const config: QuoteConfig = {
  network: APPROVED_QUOTE_NETWORK,
  sellerAddress: "0x1111111111111111111111111111111111111111",
  contentDigest: APPROVED_CONTENT_DIGEST,
  ttlMilliseconds: 300_000,
};
const validSource = (): QuoteSourcePort => ({
  findBrief: async () => ({
    id: APPROVED_DECISION_BRIEF_ID,
    signalId: APPROVED_SIGNAL_ID,
    artifactVersion: 1,
  }),
  findPublishedRadarItem: async (id) =>
    id === APPROVED_SIGNAL_ID
      ? { title: "Approved Proof-v1 Decision Brief" }
      : null,
});

describe("Phase 1 Decision Brief quote", () => {
  it("serves POST /decision-brief/quote without entering payment verification", async () => {
    const payments = new FakePaymentVerifier({ kind: "required" });
    const app = createApp({
      content: new FixtureRadarContentAdapter(),
      payments,
      repository: new InMemoryFulfillmentRepository(),
      quoteSource: validSource(),
      quoteStore: new InMemoryQuoteStore(),
      quoteConfig: config,
      now: () => now.toISOString(),
    });
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    try {
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(
        `http://127.0.0.1:${port}/decision-brief/quote`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
        },
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        requestId: request.requestId,
        contentDigest: APPROVED_CONTENT_DIGEST,
        amount: "0.01",
        currency: "USDC",
      });
      expect(payments.calls).toBe(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("reads the publication record from radarItems/{signalId}", async () => {
    const reads: string[] = [];
    const firestore = {
      collection(name: string) {
        return {
          doc(id: string) {
            return {
              async get() {
                reads.push(`${name}/${id}`);
                return {
                  exists: true,
                  data: () => ({
                    id,
                    publicTitle: "Published title",
                    publicationState: "published",
                  }),
                };
              },
            };
          },
        };
      },
    };
    expect(
      await new FirestoreQuoteSource(firestore).findPublishedRadarItem(
        APPROVED_SIGNAL_ID,
      ),
    ).toEqual({ title: "Published title" });
    expect(reads).toEqual([`radarItems/${APPROVED_SIGNAL_ID}`]);
  });

  it("returns the exact frozen quote contract without the Brief body", async () => {
    const quote = await issueDecisionBriefQuote(
      request,
      validSource(),
      new InMemoryQuoteStore(),
      config,
      now,
    );
    expect(quote).toEqual({
      quoteId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      requestId: request.requestId,
      serviceId: "lafryhi-ai-radar-decision-brief",
      serviceVersion: "1.0.0",
      decisionBriefId: APPROVED_DECISION_BRIEF_ID,
      title: "Approved Proof-v1 Decision Brief",
      artifactVersion: 1,
      contentDigest: APPROVED_CONTENT_DIGEST,
      amount: "0.01",
      currency: "USDC",
      network: APPROVED_QUOTE_NETWORK,
      sellerAddress: config.sellerAddress,
      expiresAt: "2026-08-08T12:05:00.000Z",
    });
    expect(JSON.stringify(quote)).not.toMatch(
      /ownerId|businessProfileId|businessName|businessContext|budget|riskTolerance|currentTools|session|prompt|modelOutput|credential|sourceText|result|signalSnapshot/i,
    );
  });

  it("fails closed for an unknown Brief", async () => {
    const source = validSource();
    source.findBrief = async () => null;
    await expect(
      issueDecisionBriefQuote(
        request,
        source,
        new InMemoryQuoteStore(),
        config,
        now,
      ),
    ).rejects.toMatchObject({ code: "DECISION_BRIEF_NOT_FOUND", status: 404 });
  });

  it("fails closed for a wrong Brief binding", async () => {
    const source = validSource();
    source.findBrief = async () => ({
      id: APPROVED_DECISION_BRIEF_ID,
      signalId: "wrong-signal",
      artifactVersion: 1,
    });
    await expect(
      issueDecisionBriefQuote(
        request,
        source,
        new InMemoryQuoteStore(),
        config,
        now,
      ),
    ).rejects.toMatchObject({ code: "DECISION_BRIEF_NOT_APPROVED" });
  });

  it("rejects an unpublished radarItems source", async () => {
    const source = validSource();
    source.findPublishedRadarItem = async () => null;
    await expect(
      issueDecisionBriefQuote(
        request,
        source,
        new InMemoryQuoteStore(),
        config,
        now,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_NOT_PUBLISHED" });
  });

  it("rejects a digest mismatch", async () =>
    expect(
      issueDecisionBriefQuote(
        request,
        validSource(),
        new InMemoryQuoteStore(),
        { ...config, contentDigest: "0".repeat(64) },
        now,
      ),
    ).rejects.toMatchObject({ code: "ARTIFACT_DIGEST_MISMATCH" }));

  it("rejects mainnet and missing seller configuration", async () => {
    await expect(
      issueDecisionBriefQuote(
        request,
        validSource(),
        new InMemoryQuoteStore(),
        { ...config, network: "eip155:1" },
        now,
      ),
    ).rejects.toMatchObject({ code: "QUOTE_TESTNET_CONFIGURATION_INVALID" });
    await expect(
      issueDecisionBriefQuote(
        request,
        validSource(),
        new InMemoryQuoteStore(),
        { ...config, sellerAddress: undefined },
        now,
      ),
    ).rejects.toMatchObject({ code: "SELLER_ADDRESS_MISSING" });
  });

  it("is idempotent only while the stored quote is unexpired", async () => {
    const store = new InMemoryQuoteStore();
    const first = await issueDecisionBriefQuote(
      request,
      validSource(),
      store,
      config,
      now,
    );
    const duplicate = await issueDecisionBriefQuote(
      request,
      validSource(),
      store,
      config,
      new Date(now.getTime() + 1_000),
    );
    expect(duplicate).toEqual(first);
    await expect(
      issueDecisionBriefQuote(
        request,
        validSource(),
        store,
        config,
        new Date(now.getTime() + 300_000),
      ),
    ).rejects.toMatchObject({ code: "QUOTE_REQUEST_EXPIRED" });
  });

  it("rejects a duplicate requestId with changed buyer binding", async () => {
    const store = new InMemoryQuoteStore();
    await issueDecisionBriefQuote(request, validSource(), store, config, now);
    await expect(
      issueDecisionBriefQuote(
        { ...request, buyerAgentReference: "different-buyer" },
        validSource(),
        store,
        config,
        now,
      ),
    ).rejects.toMatchObject({ code: "QUOTE_REQUEST_CONFLICT" });
  });

  it("strictly rejects invalid requests and payment proof fields", () => {
    for (const body of [
      { ...request, requestId: "bad id" },
      { ...request, decisionBriefId: "9351c44b-390e-4337-b8b6-d820a8df7fb3" },
      { ...request, buyerAgentReference: "x" },
      { ...request, paymentProof: "not-accepted" },
    ])
      expect(DecisionBriefQuoteRequestSchema.safeParse(body).success).toBe(
        false,
      );
  });
});
