# LAFRYHI AI Radar v1.0.0-rc1 Baseline Manifest

## Release identity

| Field | Baseline value |
|---|---|
| Release name | LAFRYHI AI Radar v1.0.0-rc1 |
| Release status | Release candidate |
| Release date | 2026-07-27 |
| Source commit before release documentation | `a13ca42d6f7b02beb8eadec8ca8e5dfda0dcab0e` |
| Release documentation commit | Resolved by annotated tag `v1.0.0-rc1` |
| Git tag | `v1.0.0-rc1` |
| Verification classification | `PASS_WITH_VERIFICATION_LIMITATION` |
| Worktree state at completion | Clean |

The annotated tag object records the exact release documentation commit. The
committed manifest intentionally does not attempt to contain its own commit
hash.

## Build and deployment

| Field | Baseline value |
|---|---|
| Cloud Build ID | `e9c8f724-9a72-4792-97b3-b608d1fb1fb8` |
| Immutable image tag | `0f271d5` |
| Image digest | `sha256:f474ae825989908e7412a073af865ed59277ea272b65102f0a2469e5c37d17b5` |
| Active revision | `lafryhi-ai-radar-canary2-0f271d5` |
| Stable fallback revision | `lafryhi-ai-radar-baseline-3405af8` |
| Traffic allocation | Canary 100%; stable fallback 0% |
| `AI_RECOVERY_ENABLED` | `true` |
| `ATOMIC_ANALYSIS_FINALIZATION_ENABLED` | `true` |

No deployment, traffic change, feature-flag change, migration, or Firestore
mutation is part of this release-documentation task.

## Analysis baseline

| Field | Baseline value |
|---|---|
| Prompt version | `radar-decision-intelligence-v3` |
| Initial Gemini call | 1 |
| Maximum identical transient retries | 2 |
| Maximum regeneration | 1 total |
| Maximum Gemini calls | 4 |
| Verified tests | 190/190 across 18 files |
| Evidence contract | Exact contiguous source substring after Unicode NFC and deterministic whitespace normalization only |

Evidence acceptance explicitly excludes fuzzy matching, case-insensitive
acceptance, punctuation-insensitive acceptance, semantic-similarity acceptance,
closest-sentence substitution, automatic evidence replacement, and
NFKC-based compatibility collapsing.

## Verification limitation

Directly invoking completed analysis finalization a second time in production
is `NOT_EXECUTABLE_BY_DESIGN`. The operation is internal and has no supported
production endpoint or operator action. Direct invocation would require a code
change, temporary endpoint, ad hoc runner, direct internal invocation, or
database manipulation.

Assurance is provided by unit and integration tests, deterministic identifiers,
the committed production transaction, exact linked state, zero orphan or
duplicate records, and downstream publication idempotency. No contradictory
production evidence or material safety risk remains.

## Documentation file integrity

The following files are created by this release task:

- `RELEASE_NOTES_v1.0_RC1.md`
- `ARCHITECTURE_DECISIONS.md`
- `BASELINE_MANIFEST.md`
- `OPERATIONS_RUNBOOK.md`
- `SECURITY_ASSUMPTIONS.md`
- `KNOWN_LIMITATIONS.md`

No existing documentation file is rewritten by this task. Documentation file
hashes are not recorded because none are required for the baseline and no hash
should be fabricated.
