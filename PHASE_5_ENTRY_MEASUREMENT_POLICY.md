# Phase 5.1 Entry Measurement Policy

## Status

- Status: Approved for entry evidence
- Approval date: 2026-07-27
- Owner: Evaluation Owner
- Scope: Local reference measurements and provisional CI projections

## Purpose

This policy defines reproducible evidence for setting initial engineering budgets before Phase 5.1 implementation. It prevents estimates, cached observations, and incomplete runs from being presented as measured facts.

These measurements characterize the existing repository validation workload. They are not benchmarks or performance guarantees for unimplemented Phase 5 algorithms.

## Environment capture

Every measurement record must include, when available:

- timestamp with UTC offset;
- operating-system name and version;
- processor identifier, architecture, and logical processor count;
- installed memory and free memory;
- Node version;
- package-manager and version;
- shell version;
- Git version;
- repository branch and exact commit;
- dependency lockfile state;
- command working directory;
- relevant non-secret environment classification;
- whether prior build artifacts/caches existed.

Unavailable information is recorded as unavailable with the reason. Elevated access is not required solely to collect hardware metadata.

## Command capture

Record:

- exact direct command;
- any measurement wrapper;
- working directory;
- repetition index;
- wall-clock duration in milliseconds;
- process exit status;
- timeout and termination behavior;
- whether output was suppressed only for measurement readability.

Commands must be deterministic repository commands already available through the operating system or package scripts. No benchmarking dependency may be installed.

## Cold and warm runs

- **Controlled cold run:** relevant caches/build outputs are absent through an approved, reproducible cleanup procedure.
- **Sequence-first run:** first run in a measurement sequence when cache state is not fully controlled.
- **Warm run:** subsequent run with unchanged inputs and existing caches.

A sequence-first run must not be called cold unless cache removal was controlled. Cold and warm results are reported separately where both exist.

## Repetitions

- Short commands: prefer at least five successful repetitions.
- Expensive commands such as a full production build: prefer at least three successful repetitions.
- Pure-operation microbenchmarks: at least 1,000 measured operations per input-size band in each of at least five process runs.
- Corpus evaluation: at least five complete runs after one unreported setup/warm-up pass, unless the completion gate approves a different count.

Every attempted run is recorded. Failed or timed-out runs are not silently removed.

## Outliers

- Retain all observations by default.
- An observation may be excluded from an aggregate only for a documented external cause, such as an operating-system update or confirmed unrelated process saturation.
- Preserve the raw observation, exclusion rationale, and aggregate with and without exclusion.
- Cache-related first-run differences are reported as sequence-first behavior, not discarded.

## Statistics

- Report each duration and the median.
- Report minimum and maximum for context.
- Report p95 only when the sample count and method make it meaningful.
- Five or three repetitions are insufficient for a stable empirical p95; do not relabel the maximum as p95.
- For pure-operation benchmarks with at least 1,000 observations, use nearest-rank p95 and record the method.
- Do not interpolate or manufacture percentiles from insufficient samples.

## Measurement method

- Wall-clock time uses a monotonic process stopwatch where available.
- Process exit status is authoritative for success.
- Peak memory is reported only when the operating system or runner provides a reliable per-process observation.
- If peak memory cannot be isolated reliably, record it as unavailable and require future instrumentation in the offline harness.
- File and log sizes use byte counts from the generated artifact directories.

## Reproducibility

A reproducible result requires:

- exact command and commit;
- unchanged dependency lockfile;
- captured runtime versions;
- fixed corpus, schema, algorithm, normalization, logical clock, and seed versions where applicable;
- all runs and failures reported;
- the same classification/output manifest across deterministic repetitions.

## Local and CI limitations

Local results:

- depend on one workstation, cache state, power mode, background activity, and filesystem;
- are reference-environment budgets only;
- do not predict another workstation or CI runner exactly.

CI projections:

- are provisional until the first actual CI runs;
- must be recalibrated using captured runner specifications;
- cannot be converted to monetary cost without verified billing/rate information.

No comparison to an external system or runner is permitted unless both systems are directly measured under compatible workloads.

## Estimates versus facts

- Measured facts identify command, repetitions, durations, exits, and environment.
- Arithmetic projections are labeled projections.
- Provisional budgets are governance limits, not measured algorithm performance.
- Unimplemented algorithm performance must never be described as measured.
- Failed combined runs remain failed measurements and cannot be replaced by summed component medians.

## Result timestamp and approval

Every report records its timestamp and owning commit. Budget revisions require Evaluation Owner and Operations Owner approval, with Architecture Owner review when the limit changes implementation design.
