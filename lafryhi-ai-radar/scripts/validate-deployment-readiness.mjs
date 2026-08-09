import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];
const pass = [];

function requireText(file, pattern, description) {
  if (!pattern.test(read(file))) failures.push(`${file}: ${description}`);
  else pass.push(`${file}: ${description}`);
}

function forbidText(file, pattern, description) {
  if (pattern.test(read(file))) failures.push(`${file}: ${description}`);
  else pass.push(`${file}: ${description}`);
}

for (const file of ["Dockerfile", "services/x402-seller/Dockerfile"]) {
  requireText(file, /^FROM node:22-alpine/m, "uses Node.js 22 Alpine");
  requireText(file, /RUN npm ci/, "uses immutable dependency installation");
  requireText(file, /^USER (nextjs|seller)$/m, "runs as a non-root user");
  requireText(file, /^EXPOSE 8080$/m, "exposes port 8080");
  forbidText(
    file,
    /COPY\s+\.env|ARG\s+.*(?:TOKEN|SECRET|KEY)/i,
    "does not copy env files or accept secret build arguments",
  );
}

requireText(
  "cloudbuild.yaml",
  /args:\s*\["build",\s*"-t"/,
  "builds a tagged container image",
);
requireText(
  "cloudbuild.yaml",
  /\$\{_IMAGE\}/,
  "uses the explicit image substitution",
);
forbidText(
  "cloudbuild.yaml",
  /gcloud[^\n]*(?:run deploy|services replace)|kubectl|payment/i,
  "has no deploy or payment mutation step",
);
forbidText("cloudbuild.yaml", /:latest\b/, "does not use the latest tag");

const radar = "cloudrun.service.yaml";
requireText(radar, /name: lafryhi-ai-radar\b/, "targets the Radar service");
requireText(
  radar,
  /serviceAccountName: lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize\.iam\.gserviceaccount\.com/,
  "uses the dedicated Radar runtime identity",
);
requireText(
  radar,
  /image: REPLACE_WITH_IMMUTABLE_RADAR_IMAGE_DIGEST/,
  "requires an immutable image substitution",
);
requireText(
  radar,
  /name: RADAR_EXPORT_AUDIENCE\s+value: https:\/\/lafryhi-ai-radar-1090908272413\.us-central1\.run\.app/,
  "uses the approved numbered export audience",
);
requireText(
  radar,
  /name: RADAR_EXPORT_SELLER_SERVICE_ACCOUNT/,
  "declares the exact seller identity",
);
requireText(
  radar,
  /name: RADAR_EXPORT_LOCAL_AUTH_ENABLED[\s\S]*?value: "false"/,
  "disables local export authentication",
);
forbidText(
  radar,
  /RADAR_EXPORT_LOCAL_SECRET/,
  "does not configure a production local export secret",
);
requireText(
  radar,
  /name: lafryhi-ai-radar-operator-token[\s\S]*?key: "1"/,
  "preserves the Operator Secret Manager reference",
);
requireText(
  radar,
  /name: lafryhi-ai-radar-scheduler-secret[\s\S]*?key: "2"/,
  "preserves the Scheduler Secret Manager reference",
);
requireText(
  radar,
  /startupProbe:[\s\S]*?path: \/api\/health/,
  "uses Radar health for startup probing",
);
requireText(
  radar,
  /livenessProbe:[\s\S]*?path: \/api\/health/,
  "uses Radar health for liveness probing",
);

const seller = "services/x402-seller/cloudrun.service.yaml";
requireText(
  seller,
  /name: lafryhi-x402-seller\b/,
  "targets the seller service",
);
requireText(
  seller,
  /serviceAccountName: lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize\.iam\.gserviceaccount\.com/,
  "uses the dedicated seller runtime identity",
);
requireText(
  seller,
  /image: REPLACE_WITH_IMMUTABLE_IMAGE_DIGEST/,
  "requires an immutable image substitution",
);
requireText(
  seller,
  /name: PAYMENT_MODE, value: disabled/,
  "keeps payment disabled",
);
requireText(
  seller,
  /name: RADAR_CONTENT_MODE, value: http/,
  "uses the production HTTP content adapter",
);
requireText(
  seller,
  /name: RADAR_EXPORT_URL,\s+value: "https:\/\/lafryhi-ai-radar-1090908272413\.us-central1\.run\.app\/api\/internal\/agent-services\/published-radar-export"/,
  "uses the approved numbered Radar export URL",
);
requireText(
  seller,
  /name: RADAR_EXPORT_AUDIENCE,\s+value: "https:\/\/lafryhi-ai-radar-1090908272413\.us-central1\.run\.app"/,
  "uses the approved numbered Radar token audience",
);
forbidText(
  seller,
  /lafryhi-ai-radar-c5a4cs6xgq-uc\.a\.run\.app/,
  "does not use the old Radar origin",
);
requireText(
  seller,
  /autoscaling\.knative\.dev\/minScale: "0"[\s\S]*?autoscaling\.knative\.dev\/maxScale: "1"/,
  "uses conservative scaling",
);
forbidText(
  seller,
  /SELLER_WALLET_ADDRESS|ACCEPTED_NETWORKS|CIRCLE_FACILITATOR_URL|RADAR_EXPORT_LOCAL_TOKEN|SERVICE_PRICE_USD/,
  "contains no payment, wallet, network, facilitator, price, or local-token configuration",
);
requireText(
  seller,
  /startupProbe:[\s\S]*?path: \/health/,
  "uses seller health for startup probing",
);
requireText(
  seller,
  /livenessProbe:[\s\S]*?path: \/health/,
  "uses seller health for liveness probing",
);

requireText(
  ".dockerignore",
  /(^|\n)\.env\*/m,
  "excludes environment files from the Radar image context",
);
requireText(
  "services/x402-seller/.dockerignore",
  /(^|\n)\.env\*/m,
  "excludes environment files from the seller image context",
);
requireText(
  "src/app/api/health/route.ts",
  /export function GET/,
  "provides Radar health",
);
requireText(
  "src/app/api/readiness/route.ts",
  /export async function GET/,
  "provides Radar readiness",
);
requireText(
  "services/x402-seller/src/server.ts",
  /app\.get\("\/health"/,
  "provides seller health",
);
requireText(
  "services/x402-seller/src/server.ts",
  /app\.get\("\/service-metadata"/,
  "provides truthful seller metadata",
);

for (const file of [
  "ops/monitoring/readiness.uptime-check.json",
  "ops/monitoring/readiness.alert-policy.json",
  "ops/monitoring/rss_scheduler_non_2xx.metric.json",
  "ops/monitoring/rss_scheduler_non_2xx.alert-policy.json",
])
  requireText(file, /[\[{]/, "exists and is non-empty");

requireText(
  "package.json",
  /"deployment:render": "node scripts\/render-cloud-run-manifests\.mjs"/,
  "exposes the local manifest renderer",
);
requireText(
  "package.json",
  /"deployment:smoke": "node scripts\/smoke-production\.mjs"/,
  "exposes the GET-only smoke runner",
);
requireText(
  "scripts/render-cloud-run-manifests.mjs",
  /RENDERED_NOT_DEPLOYED/,
  "renders without claiming deployment",
);
forbidText(
  "scripts/smoke-production.mjs",
  /decision-brief|method:\s*["']POST/,
  "never invokes the paid route or sends POST requests",
);

console.log(
  JSON.stringify(
    {
      status: failures.length ? "FAILED" : "READY",
      checksPassed: pass.length,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exit(1);
