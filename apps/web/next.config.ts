import type { NextConfig } from "next";
import path from "node:path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  // Empty on a custom domain; "/aiforge" for a GitHub Pages project site.
  basePath,
  // Static export: no server needed, deployable to any static host.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ["@aiforge/content-schema", "@aiforge/runner", "@aiforge/engine", "@aiforge/games"],
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
};

export default config;
