# Gemini Candidate Availability Probe

## Purpose and safety boundary

The probe checks whether an operator-selected candidate can answer a tiny structured-output request in explicitly listed Vertex AI locations. It does not run production prompts, use source documents, write Firestore, call publication code, modify sessions, deploy, change traffic, or change production configuration. Production remains `gemini-2.5-flash`.

A successful probe means only `AVAILABLE_FOR_EVALUATION`. It never means production approval, canary eligibility, or production eligibility.

## Availability versus compatibility

The report treats these as separate facts:

- transport success: the Vertex endpoint accepted and returned a response;
- model availability: the requested model produced a response in that location;
- JSON validity: the original response text is raw parseable JSON;
- schema compatibility: parsed JSON exactly matches the tiny required contract;
- production compatibility: not established by this probe.

A resolved `generateContent` response marks the endpoint and model reachable even when the text is empty, malformed, fenced, or introduced by prose. Only raw JSON in the original response can pass strict compatibility. Diagnostic extraction of fenced or prose-wrapped JSON explains failures but never turns them into a pass.

Overall outcomes are:

- `AVAILABLE_FOR_EVALUATION`: at least one location returned compatible raw JSON;
- `REACHABLE_BUT_CONTRACT_FAILED`: at least one model response was received, but strict output failed;
- `UNAVAILABLE`: every attempted location returned model-not-found;
- `UNKNOWN_OR_ACCESS_FAILURE`: authentication, authorization, configuration, or mixed unresolved failures.

## Prerequisites

- Node.js and project dependencies installed.
- An approved Google Cloud project with Vertex AI access.
- Local Application Default Credentials obtained through the organization’s approved authentication process.
- An exact candidate model ID verified by the operator.
- Explicit evaluation allowlist and lifecycle metadata.

Never store credentials in `.env.example`, reports, or source control.

## Probe versus evaluation

The probe sends a tiny JSON request capped at 128 output tokens. It checks reachability and structured-output compatibility, optionally followed by a thinking-configuration check. The smoke evaluation runs the existing two-stage production contract against exactly one marked synthetic case by default. Neither action authorizes deployment.

## Required controls

Real calls require:

- `GEMINI_EVALUATION_ENABLED=true`
- exact `GEMINI_EVALUATION_CANDIDATE_MODEL`
- the same exact ID in `GEMINI_EVALUATION_ALLOWED_MODELS`
- `GEMINI_EVALUATION_ALLOW_REAL_CALLS=true`
- non-empty `GEMINI_EVALUATION_RUN_LABEL`
- explicit `GOOGLE_CLOUD_PROJECT`

“Evaluation allowlist approval is not production approval.”

Wildcards and prefix matching are rejected. The production model cannot be a candidate. Candidate maturity (`ga`, `preview`, `experimental`, or `unknown`) is operator-supplied, not inferred from its name. Only operator-marked GA candidates can ever be considered for canary eligibility.

## Locations and thinking

`GEMINI_EVALUATION_PROBE_LOCATIONS` is an ordered, deduplicated evaluation-only list, defaulting to `us-central1,global`. All locations are reported by default. No successful location is copied into `GOOGLE_CLOUD_LOCATION` or Cloud Run.

Basic structured output is always tested with thinking omitted. Optional thinking probing requires `GEMINI_EVALUATION_PROBE_THINKING=true`. Optional thinking failure does not erase basic success.

`GEMINI_EVALUATION_PROBE_SAVE_RESPONSE_PREFIX=true` stores only a sanitized 120-character prefix, response length, content type when exposed, candidate count, finish reason, model/version, and usage metadata. Full output is not stored. `GEMINI_EVALUATION_PROBE_JSON_RETRY=true` permits one budget-checked diagnostic retry after a reachable non-JSON primary response, using a stricter no-prose prompt. Retry success does not repair or promote the failed primary contract.

CLI exit codes are `0` for available-for-evaluation, `2` for reachable contract failure, `3` for total model unavailability, `4` for access/configuration failure, and `5` for an internal probe error.

## Cost controls

The probe and smoke commands calculate maximum planned requests and estimated token bounds before calls. Defaults are six requests, 20,000 estimated input tokens, and 5,000 estimated output tokens. The smoke hard case limit defaults to one and can never exceed 15. No exact monetary cost is claimed.

## Procedure

1. Verify ADC without printing credentials.
2. Configure candidate, exact allowlist, lifecycle stage, project, run label, and explicit real-call flag.
3. Run `npm run eval:gemini:probe:validate`.
4. Run `npm run eval:gemini:probe:dry-run`.
5. After reviewing output, run `npm run eval:gemini:probe`.
6. Review redacted JSON and Markdown under `eval/results/probes`.
7. Only after a successful report, set a new smoke run label and run `npm run eval:gemini:smoke`.

The default smoke command selects only `official-google-announcement`, a concise synthetic English official-source case exercising both pipeline stages.

## Error interpretation

- `auth`: local credentials are absent or invalid; no retry occurs.
- `authorization`: credentials lack required permission; no retry occurs.
- `model-availability`: the exact model is unavailable in that location.
- `transient`: one retry may occur.
- `permanent`: request or model configuration is unsupported.

Probe reports are redacted and contain no environment dump, access token, credential, or service-account material.
