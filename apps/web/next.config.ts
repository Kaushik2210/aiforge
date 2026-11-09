import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  // Static export: no server needed, deployable to any static host.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ["@aiforge/content-schema", "@aiforge/runner"],
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
};

export default config;
