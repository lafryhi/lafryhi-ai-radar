# Phase 5.1 Entry Baseline Measurements

## Record

- Measurement timestamp: 2026-07-27T12:30:13+01:00 through 2026-07-27T12:36 local
- Repository branch: `phase-5/source-intelligence-foundation`
- Repository commit: `79dd9067e37482a1b4684652c78f62361d1773a5`
- Working directory: repository root
- Policy: `PHASE_5_ENTRY_MEASUREMENT_POLICY.md`
- Purpose: Existing repository-validation baseline only

No Phase 5.1 algorithm exists or was benchmarked.

## Environment

| Attribute | Captured value |
|---|---|
| Operating system runtime | Microsoft Windows NT 10.0.26200.0 |
| Processor identifier | Intel64 Family 6 Model 186 Stepping 3, GenuineIntel |
| Processor architecture | AMD64 |
| Logical processors visible to runtime | 8 |
| Installed/free physical memory | Unavailable: Windows WMI access was denied |
| Reliable per-process peak memory | Unavailable with the approved existing tools |
| Node | v22.19.0 |
| npm | 10.9.3 |
| PowerShell | 5.1.26100.8894 |
| Git | 2.54.0.windows.1 |
| Cache state | Existing dependencies and prior build artifacts were present |

The runs are sequence-first/warm observations, not controlled cold runs. No cache or build directory was deleted to manufacture a cold condition.

## Measurement wrapper

Each direct command was invoked by PowerShell with a monotonic `.NET Diagnostics.Stopwatch`. Command output was suppressed during repetition measurement, exit status was retained, and durations were reported in milliseconds.

Conceptual wrapper:

```powershell
$sw = [Diagnostics.Stopwatch]::StartNew()
& npm.cmd <arguments> *> $null
$code = $LASTEXITCODE
$sw.Stop()
```

Output suppression changed reporting only; it did not change package scripts.

## Full test suite

- Exact direct command: `npm.cmd test`
- Repetitions: 5
- Durations: 4,699 ms; 4,024 ms; 4,239 ms; 4,148 ms; 4,228 ms
- Median: 4,228 ms
- Minimum/maximum: 4,024 / 4,699 ms
- p95: Not reported; five samples are insufficient for a stable empirical p95
- Exit statuses: 0, 0, 0, 0, 0
- Result: PASS on every run
- Test result: 190/190 tests across 18 files
- Peak memory: Unavailable

Interpretation: Existing tests complete in roughly 4.0–4.7 seconds on this warm reference environment.

## Lint

- Exact direct command: `npm.cmd run lint`
- Repetitions: 5
- Durations: 10,818 ms; 7,835 ms; 7,633 ms; 7,972 ms; 7,827 ms
- Median: 7,835 ms
- Minimum/maximum: 7,633 / 10,818 ms
- Warm-only median after the sequence-first run: 7,831 ms
- p95: Not reported; five samples are insufficient
- Exit statuses: 0, 0, 0, 0, 0
- Result: PASS on every run
- Peak memory: Unavailable

Interpretation: The sequence-first observation was slower and is retained, not excluded.

## Typecheck

- Exact direct command: `npm.cmd run typecheck`
- Repetitions: 5
- Durations: 3,359 ms; 2,786 ms; 2,966 ms; 3,050 ms; 2,828 ms
- Median: 2,966 ms
- Minimum/maximum: 2,786 / 3,359 ms
- Warm-only median after the sequence-first run: 2,897 ms
- p95: Not reported; five samples are insufficient
- Exit statuses: 0, 0, 0, 0, 0
- Result: PASS on every run
- Peak memory: Unavailable

## Production build

- Exact direct command: `npm.cmd run build`
- Repetitions: 3
- Durations: 36,415 ms; 36,590 ms; 40,675 ms
- Median: 36,590 ms
- Minimum/maximum: 36,415 / 40,675 ms
- p95: Not reported; three samples are insufficient
- Exit statuses: 0, 0, 0
- Result: PASS on every run
- Peak memory: Unavailable

Interpretation: Build is the dominant existing validation cost. These were not controlled cold runs.

## Focused command review

`package.json` defines `test`, `lint`, `typecheck`, and `build`. It does not define a separate focused Phase 5 or source-intelligence validation script. No ad hoc test filter was used because Phase 5.1 implementation and tests do not exist.

## Combined validation attempt

Attempted serial sequence:

```text
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

- Repetitions attempted: 1
- Measurement window: 60,000 ms
- Observed result: command wrapper timed out after 60,487 ms and was terminated
- Exit status reported by command runner: 124
- Completed wall-clock duration: unavailable because the full sequence did not complete
- Aggregate inclusion: retained as a failed measurement; excluded from successful-duration statistics

No p95 or completed combined duration is claimed. The failure demonstrates only that the combined reference budget must exceed 60 seconds or use a longer runner timeout.

## Planning interpretation

- Sum of component medians: 51,619 ms. This is an arithmetic projection, not a measured combined duration.
- The Phase 5.1 incremental CI budget should remain small relative to the existing validation sequence and must be measured independently after implementation.
- Local/CI budgets are reference limits, not hardware-independent guarantees.
- Phase 5.1 algorithm latency, memory, corpus duration, and artifacts remain unmeasured because no implementation or corpus exists.

## Limitations

- One local workstation only.
- No controlled cold cache.
- WMI blocked detailed CPU/RAM capture.
- No reliable peak-memory observation.
- No CI runner or billing data.
- No Phase 5.1 implementation, corpus, or algorithm benchmark.
- Background operating-system activity was not controlled.
