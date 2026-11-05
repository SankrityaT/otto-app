import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Hide the Next.js developer badge so it never shows up in demos or screenshots.
  devIndicators: false,
  partialPrefetching: true,
  turbopack: {
    // Only watch this app. Without this, Next can pick a parent folder and reload on unrelated file changes.
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
