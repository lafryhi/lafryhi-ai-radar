# x402 payment requirements contract

The wire contract is x402 protocol version 2 as emitted by `@circle-fin/x402-batching` 3.2.0. Unpaid responses use HTTP 402 and the official `PAYMENT-REQUIRED` header; buyers retry with `PAYMENT-SIGNATURE`. This repository does not duplicate or invent Circle network, asset, facilitator, or settlement schemas.
