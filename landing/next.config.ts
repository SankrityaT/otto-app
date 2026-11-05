import path from "node:path";
import type { NextConfig } from "next";

/** The landing page is served under /landing on the same domain as the app (see web/next.config.ts). */
const basePath = "/landing";

const nextConfig: NextConfig = {
  basePath,
  // Hide the Next.js developer badge so it never shows up in demos or screenshots.
  devIndicators: false,
  // Lets plain <img> tags and file loads find /public files under the base path too.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {
    // Only watch this app, not the rest of the repo.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
