# Cloud Run deployment readiness

The Dockerfile uses Node 22, immutable `npm ci`, a non-root runtime user, port 8080, and no environment file in the image. The manifest is a template only and intentionally contains replacement markers and `PAYMENT_MODE=disabled`.

Before any deployment:

1. Create a dedicated least-privilege seller service account.
2. Implement and validate a durable atomic fulfillment repository.
3. Configure a real seller wallet role through Secret Manager without committing the address as claimed proof.
4. Select supported networks from the pinned Circle SDK/official supported-kinds response; do not hardcode from memory.
5. Configure the Circle facilitator URL explicitly for the approved environment.
6. Protect the future Radar export with Cloud Run IAM and an audience-bound identity token. The HTTP adapter currently documents this boundary but does not mint tokens.
7. Use an immutable image digest, choose safe min/max scale, configure request timeout/rate limits, and capture revision, image, IAM, health, and log evidence.
8. Run a separately authorized controlled proof transaction. Never run it in CI or the default suite.

No deployment command is included or executed by this sprint. Revision URL, revision name, image digest, wallet proof, provider verification, Circle record, batch transaction, and explorer link remain `PENDING_REAL_PROOF`.
