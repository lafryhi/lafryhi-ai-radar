# Dependency record

Versions were checked against official Circle documentation, official x402 sources, and npm registry metadata on 2026-08-03. All package manifest entries are exact and the full transitive graph is locked.

| Package                     | Version | Purpose                                                | License    | Risk note                                                   |
| --------------------------- | ------: | ------------------------------------------------------ | ---------- | ----------------------------------------------------------- |
| `@circle-fin/x402-batching` |   3.2.0 | Official Gateway seller middleware/batched facilitator | Apache-2.0 | Payment-critical; verify release changes before upgrades    |
| `@x402/core`                |  2.20.0 | x402 v2 protocol peer                                  | Apache-2.0 | Payment-critical protocol surface                           |
| `@x402/evm`                 |  2.20.0 | EVM exact-scheme peer                                  | Apache-2.0 | Chain/signature code; never exercised with wallets in tests |
| `viem`                      | 2.55.10 | Circle SDK peer/EVM primitives                         | MIT        | Broad chain surface and transitive crypto dependencies      |
| `express`                   |   5.2.1 | Minimal Node HTTP service                              | MIT        | Public request parser/routing boundary                      |
| `zod`                       |   4.4.3 | Strict runtime contracts                               | MIT        | Validation behavior is security-relevant                    |
| TypeScript                  |   7.0.2 | Compiler                                               | Apache-2.0 | Build-only                                                  |
| Vitest                      |  4.1.10 | Isolated tests                                         | MIT        | Build-only; no live calls                                   |
| tsx                         |  4.23.5 | Development execution                                  | MIT        | Build-only                                                  |
| Prettier                    |   3.8.1 | Format verification                                    | MIT        | Build-only                                                  |

Official sources: Circle seller quickstart, Nanopayments SDK reference, x402 integration guide, batched-settlement concept, supported-network reference/API, and Circle Marketplace documentation. Package versions/licenses are registry facts; package APIs are taken from Circle/x402 primary documentation.
