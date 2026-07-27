# Phase 4 Production Verification Protocol

This protocol separates implementation failures from verification limitations.
It applies to Phase 4 production canaries and readiness gates. Historical raw
execution reports remain immutable; any later classification correction must
be recorded as a separate assessment.

## Requirement-level statuses

Every verification requirement receives exactly one status.

### PASS

Use `PASS` when the required operation was executed, the expected result was
observed, and all relevant safety and integrity invariants passed.

### FAIL

Use `FAIL` only when an executed operation produced an incorrect result, an
expected invariant was violated, an unexpected exception or regression
occurred, or the system:

- created duplicate, orphaned, inconsistent, unauthorized, or automatically
  published records;
- exceeded a documented retry, regeneration, or provider-call ceiling; or
- emitted sensitive or forbidden data in telemetry or logs.

The absence of a production interface for an intentionally internal operation
is not a failure.

### NOT_EXECUTABLE_BY_DESIGN

Use `NOT_EXECUTABLE_BY_DESIGN` only when all of the following are true:

- the behavior is intentionally internal;
- no production endpoint, operator action, or supported interface exposes it;
- invocation would require a code modification, temporary endpoint, ad hoc
  runner, direct database manipulation, or another out-of-scope mechanism;
- indirect structural evidence is available; and
- no contradictory evidence or invariant violation was observed.

This status records a verification limitation, not an implementation defect.
The absence of an unnecessary production endpoint must not be treated as a
defect.

### NOT_RUN

Use `NOT_RUN` when the operation could have been executed safely through an
existing supported interface but was skipped because of time, operator choice,
missing permission, interruption, or incomplete execution.

### BLOCKED

Use `BLOCKED` when an external dependency, outage, permission problem,
environment failure, or prerequisite failure prevented execution and the
condition is not an intentional property of the application design.

## Overall gate

### PASS

Return `PASS` when every critical executable requirement is `PASS`, no
requirement is `FAIL`, no unresolved critical `BLOCKED` result remains, every
`NOT_EXECUTABLE_BY_DESIGN` result is documented with sufficient indirect
evidence, and no production safety concern remains.

### PASS_WITH_VERIFICATION_LIMITATION

Return `PASS_WITH_VERIFICATION_LIMITATION` when:

- all executable safety, integrity, and user-facing requirements pass;
- no requirement fails;
- one or more non-user-accessible internal behaviors are
  `NOT_EXECUTABLE_BY_DESIGN`;
- unavailable direct execution leaves no material production safety risk; and
- unit, integration, deterministic-identity, transaction, structural, or
  downstream-invariant evidence supports the behavior.

### FAIL

Return `FAIL` only when at least one executed critical requirement fails, a
production invariant is violated, a safety rollback criterion is triggered, or
available evidence contradicts the expected implementation behavior.

### INCOMPLETE

Return `INCOMPLETE` when a critical supported test is `NOT_RUN` or a critical
requirement is `BLOCKED` without sufficient alternative evidence.

## Required evidence for design-limited checks

Every `NOT_EXECUTABLE_BY_DESIGN` result must record:

1. requirement name;
2. why the operation is intentionally unavailable;
3. the unsafe or out-of-scope mechanism required to invoke it;
4. direct tests already covering it outside production;
5. production structural evidence;
6. downstream invariant evidence;
7. remaining uncertainty; and
8. whether the limitation creates a material operational risk.

## Reporting rules

A gate report must include:

- a requirement-level table with status, evidence, residual uncertainty, and
  material-risk assessment;
- separate sections for executed, design-limited, not-run, blocked, and failed
  checks;
- an explicit distinction between implementation failure, dependency or
  environment blockage, operator-skipped verification, and intentional
  production inaccessibility; and
- the resulting overall gate classification.

The report must not relabel an unexecuted supported check as design-limited.
Likewise, it must not relabel an intentionally inaccessible internal operation
as failed merely because no production invocation surface exists.
