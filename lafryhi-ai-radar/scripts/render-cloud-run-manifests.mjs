import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2)
  args.set(process.argv[index], process.argv[index + 1]);

const root = resolve(import.meta.dirname, "..");
const output = required("--output-dir");
const radarImage = image(required("--radar-image"), "--radar-image");
const sellerImage = image(required("--seller-image"), "--seller-image");

mkdirSync(output, { recursive: true });
render("cloudrun.service.yaml", "radar.cloudrun.service.yaml", [
  ["REPLACE_WITH_IMMUTABLE_RADAR_IMAGE_DIGEST", radarImage],
]);
render(
  "services/x402-seller/cloudrun.service.yaml",
  "seller.cloudrun.service.yaml",
  [["REPLACE_WITH_IMMUTABLE_IMAGE_DIGEST", sellerImage]],
);

console.log(
  JSON.stringify({
    status: "RENDERED_NOT_DEPLOYED",
    outputDirectory: resolve(output),
    files: ["radar.cloudrun.service.yaml", "seller.cloudrun.service.yaml"],
  }),
);

function required(name) {
  const value = args.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function image(value, name) {
  if (
    !/^us-central1-docker\.pkg\.dev\/lafryhi-ai-radar-xprize\/lafryhi-ai-radar\/[a-z0-9-]+@sha256:[a-f0-9]{64}$/.test(
      value,
    )
  )
    throw new Error(
      `${name} must be a digest-qualified image in the approved repository`,
    );
  return value;
}

function render(source, destination, replacements) {
  let text = readFileSync(resolve(root, source), "utf8");
  for (const [placeholder, value] of replacements) {
    if (!text.includes(placeholder))
      throw new Error(`${source} is missing ${placeholder}`);
    text = text.replaceAll(placeholder, value);
  }
  if (text.includes("REPLACE_WITH_"))
    throw new Error(`${source} contains unresolved placeholders`);
  writeFileSync(resolve(output, destination), text, {
    encoding: "utf8",
    flag: "wx",
  });
}
