# Payment, fulfillment, and reconciliation lifecycles

## Payment

1. An unpaid request receives HTTP 402 and the official x402 v2 `PAYMENT-REQUIRED` header.
2. The buyer retries using `PAYMENT-SIGNATURE`.
3. Circle middleware validates the declared price, seller address, accepted network, and authorization against the route requirements.
4. Only middleware-attached verified payment context crosses the provider-neutral port.
5. Invalid, malformed, wrong-service, wrong-version, wrong-amount, wrong-network, and wrong-wallet cases produce no fulfillment.

Never trust `paid=true`, buyer settlement claims, arbitrary hashes, arbitrary references, or arbitrary wallet addresses.

## Fulfillment and human verification

After `AUTHORIZATION_VERIFIED`, the service atomically claims the payment reference and request fingerprint. It requests only public approved content through `VerifiedRadarContentPort`. Every item is schema-checked again. A matching artifact or truthful no-result artifact is returned with `FULFILLMENT_DELIVERED` and a sanitized receipt. Private reasoning, editorial notes, unpublished material, prompts, diagnostics, and credentials are outside the contract.

## Idempotency

The repository key is the verified payment reference. The stored record includes request fingerprint, buyer and business-goal references, service version, digest, status, and timestamps. Same payment plus same request returns the original artifact; same payment plus modified request is rejected. The in-memory implementation is tests/local-only. Production requires a durable atomic create-if-absent transaction (for example Firestore) and must not rely on local disk or process memory.

## Settlement and proof honesty

The following are distinct: `PAYMENT_REQUIRED`, `AUTHORIZATION_VERIFIED`, `FULFILLMENT_DELIVERED`, `SETTLEMENT_PENDING`, `SETTLEMENT_CONFIRMED`, `EXPLORER_PROOF_AVAILABLE`, and `PENDING_REAL_PROOF`. Gateway can accept authorization and serve before later batched onchain settlement. An individual request is never claimed to have an individual onchain transaction unless the official response proves that relationship.

Prize evidence may be reconciled from the individual payment record, Circle records, buyer Agent Wallet/Ledger, seller wallet/Receipt, later batch settlement, and public explorer. Missing fields remain `PENDING_REAL_PROOF`; no source is substituted for another.
