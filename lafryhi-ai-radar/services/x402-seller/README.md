# LAFRYHI AI Radar x402 seller

An isolated, independently deployable seller boundary for **LAFRYHI AI Radar — AI Business Signal Decision Brief** (`BUSINESS_DECISION_INTELLIGENCE`). It sells a useful structured artifact assembled only from public, approved, human-verified Radar records.

Status: `NOT_DEPLOYED`, `NOT_LISTED`, `NOT_OWNER_APPROVED`, and `PENDING_REAL_PROOF`. The default configuration is payment-disabled. No wallet, provider ID, service ID, transaction, settlement, or Circle approval is implied.

## Routes

- `GET /health`: minimal Cloud Run health response.
- `GET /service-metadata`: truthful contract and readiness metadata.
- `POST /decision-brief`: strict request validation, official Circle x402 middleware when explicitly enabled, verified-content fulfillment, idempotency, and a sanitized receipt.

## Local validation

```powershell
npm.cmd ci
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Tests inject a fake verifier. They make no Circle call, mutate no wallet, and perform no deployment.

## Architecture

The HTTP layer depends on three ports: `SellerPaymentVerifierPort`, `VerifiedRadarContentPort`, and `FulfillmentRepositoryPort`. The fixture content adapter is explicitly labeled demonstration data. The HTTP adapter accepts only the narrow public verified-item schema. It does not import Radar application code or access Firestore. The Circle adapter is loaded only when `PAYMENT_MODE=circle`; otherwise every paid request receives 402.

Production activation is blocked until a dedicated seller wallet role, exact accepted network configuration, durable atomic repository, Cloud Run identity, owner approval, and controlled proof run exist. See [deployment](docs/DEPLOYMENT.md), [security](docs/SECURITY.md), and [lifecycle](docs/LIFECYCLES.md).

## Human-verification invariant

Each input item must validate as `publicationStatus=published`, `reviewStatus=approved`, `humanReviewRequired=true`, `publiclyEligible=true`, with source references and a verification timestamp. Invalid, pending, rejected, unpublished, or incomplete records fail closed. When no valid match exists, the paid response truthfully says so and invents no intelligence.

## Contracts

Versioned cross-project contracts are under `contracts/`; a sanitized pre-proof example is under `examples/`. The x402 wire schema remains owned by the pinned official packages and is referenced rather than copied.
