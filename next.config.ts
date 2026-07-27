import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  experimental: {
    serverActions: {
      allowedOrigins: ["127.0.0.1:8080", "localhost:8080"],
    },
  },
};

export default nextConfig;
