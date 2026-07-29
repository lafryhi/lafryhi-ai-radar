import type { NextConfig } from "next";
import { resolve } from "node:path";

const projectRoot = resolve(__dirname);
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
