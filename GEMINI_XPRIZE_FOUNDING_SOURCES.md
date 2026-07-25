# LAFRYHI AI Radar Founding Sources

Verification and approval date: 2026-07-24.

## Governance

The human operator explicitly approved exactly five founding sources after a
read-only first-party feed review. Registration used the protected Operator
Source Management server action and the shared source-management service. No
document was written directly to Firestore.

Before registration, Phase 6.1 added two safeguards without adding a collection:

- feed URLs are normalized and duplicate normalized feed URLs are rejected;
- safe `source.registration_verified` and
  `source.registration_rejected` events carry registration metadata, including
  a SHA-256 feed URL hash rather than the raw URL.

Every approved source is Official, Enabled, and requires human review.

## Approved and registered sources

| Source ID | Display name | Publisher | Canonical domain | Verified feed | Category | Language / country |
| --- | --- | --- | --- | --- | --- | --- |
| `9fa6f5d2-c6bb-456a-bc51-f48295c13e9d` | Google AI Updates | Google | `blog.google` | `https://blog.google/innovation-and-ai/technology/ai/rss/` | `model_provider` | `en` / `US` |
| `9e9afef6-ef6c-4d0b-9f3b-856b13f5a163` | Google DeepMind News | Google DeepMind | `deepmind.google` | `https://deepmind.google/blog/rss.xml` | `research_lab` | `en` / `GB` |
| `43eb4876-6ad1-4f83-ab27-53a6190f77bf` | NVIDIA Deep Learning | NVIDIA | `blogs.nvidia.com` | `https://blogs.nvidia.com/blog/category/deep-learning/feed/` | `ai_platform` | `en` / `US` |
| `d5b99aed-5370-44c9-8332-2170058cec9e` | Hugging Face Blog | Hugging Face | `huggingface.co` | `https://huggingface.co/blog/feed.xml` | `developer_platform` | `en` / `US` |
| `5959dd50-cf72-4e95-b44c-a3bde5feb68b` | Mistral AI News | Mistral AI | `mistral.ai` | `https://mistral.ai/rss.xml` | `model_provider` | `en` / `FR` |

Duplicate validation after registration returned five domains/five unique and
five feed URLs/five unique. Cloud Logging contains five
`source.registration_verified`, five `source.created`, and five
`source.enabled` events.

## Evaluated but not registered

- Google Cloud AI: the category `/rss` URL returned HTML; the declared legacy
  feed and article domains conflict with current strict domain enforcement.
- OpenAI: official feed exceeded the 512 KiB production limit.
- Anthropic: no declared first-party feed; tested endpoint returned 404.
- Microsoft AI: two current item links crossed from `news.microsoft.com` to
  `blogs.microsoft.com`.
- Azure AI: official general feed was too broad for the first batch.
- Meta AI: no declared, reachable first-party feed was verified.

## First bounded discovery

Only Google AI Updates was executed:

- Run ID: `353333eb-16bb-430e-92c3-8dad0620debc`
- Status: success
- Items examined: 20
- Candidates accepted: 10
- Duplicates: 0
- Items skipped by the per-source acceptance bound: 10
- Validation failures: 0

All ten candidates remain `pending`. No candidate has a source-record reference.
No Gemini call, article retrieval, analysis, review, or Radar publication was
performed.

## Firestore counts

Before registration:

- `sourceRegistry`: 0
- `sourceRecords`: 1
- `processingRuns`: 3
- `analysisResults`: 1
- `reviewDecisions`: 1
- `radarItems`: 1
- `rssCandidates`: 0
- `rssDiscoveryRuns`: 0

After registration and the single discovery:

- `sourceRegistry`: 5
- `sourceRecords`: 1
- `processingRuns`: 3
- `analysisResults`: 1
- `reviewDecisions`: 1
- `radarItems`: 1
- `rssCandidates`: 10
- `rssDiscoveryRuns`: 1

The historical article, processing, analysis, review, and Radar records remained
unchanged.

