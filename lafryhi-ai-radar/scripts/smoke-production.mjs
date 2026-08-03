const args = new Map();
for (let index = 2; index < process.argv.length; index += 2)
  args.set(process.argv[index], process.argv[index + 1]);

const radarOrigin = origin(args.get("--radar-url"), "--radar-url");
const sellerOrigin = origin(args.get("--seller-url"), "--seller-url");
const results = [];

async function request(name, url, expectedStatus, token) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (response.status !== expectedStatus)
    throw new Error(
      `${name}: expected ${expectedStatus}, received ${response.status}`,
    );
  results.push({ name, status: response.status, body });
  return body;
}

function origin(value, flag) {
  if (!value) throw new Error(`Missing ${flag}`);
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(`${flag} must be an HTTPS origin`);
  return url.origin;
}

await request("radar.health", `${radarOrigin}/api/health`, 200);
await request("radar.readiness", `${radarOrigin}/api/readiness`, 200);
await request(
  "radar.export.anonymous",
  `${radarOrigin}/api/internal/agent-services/published-radar-export?topic=AI&maximumItemCount=1`,
  401,
);
await request("seller.health", `${sellerOrigin}/health`, 200);
const metadata = await request(
  "seller.metadata",
  `${sellerOrigin}/service-metadata`,
  200,
);
if (metadata?.marketplaceListingStatus !== "NOT_LISTED")
  throw new Error("seller.metadata: Marketplace status is not NOT_LISTED");
if (metadata?.paymentConfigurationStatus !== "PENDING_REAL_PROOF")
  throw new Error("seller.metadata: payment proof status is not pending");
const serialized = JSON.stringify(metadata);
if (
  /walletAddress|transactionHash|settlementProof|explorerProof/i.test(
    serialized,
  )
)
  throw new Error("seller.metadata: unsupported proof field exposed");

const authorizedToken = process.env.RADAR_EXPORT_ID_TOKEN;
if (authorizedToken)
  await request(
    "radar.export.authorized",
    `${radarOrigin}/api/internal/agent-services/published-radar-export?topic=AI&maximumItemCount=1`,
    200,
    authorizedToken,
  );
for (const [name, variable] of [
  ["radar.export.wrongAudience", "RADAR_EXPORT_WRONG_AUDIENCE_TOKEN"],
  ["radar.export.wrongCaller", "RADAR_EXPORT_WRONG_CALLER_TOKEN"],
]) {
  if (process.env[variable])
    await request(
      name,
      `${radarOrigin}/api/internal/agent-services/published-radar-export?topic=AI&maximumItemCount=1`,
      401,
      process.env[variable],
    );
}

console.log(
  JSON.stringify(
    { status: "PASS", paymentRequestSent: false, checks: results },
    null,
    2,
  ),
);
