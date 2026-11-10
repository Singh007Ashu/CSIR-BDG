import path from "node:path";

const isCloudflareBuild = process.env.CSIR_CLOUDFLARE_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.CSIR_DIST_DIR || ".next",
  output: "standalone",
  allowedDevOrigins: ["ipaq-producing-enclosure-input.trycloudflare.com", "*.trycloudflare.com"],
  serverExternalPackages: ["@csir/d1-client", "@csir/mysql-client"],
  webpack(config, { webpack }) {
    if (!isCloudflareBuild) config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/, path.resolve(process.cwd(), "lib/cloudflare-workers-local.mjs")));
    return config;
  },
  turbopack: {
    root: path.resolve(process.cwd()),
    resolveAlias: isCloudflareBuild
      ? {}
      : { "cloudflare:workers": "./lib/cloudflare-workers-local.mjs" },
  },
};

export default nextConfig;
