import path from "node:path";
import type { NextConfig } from "next";

/**
 * Havi's landing page is its own app (../landing), served here under /landing. In development
 * it runs on port 3001; in production, LANDING_URL is wherever it's deployed.
 */
const landingUrl = process.env.LANDING_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3001" : null);

const nextConfig: NextConfig = {
  async rewrites() {
    if (!landingUrl) return [];
    return [
      { source: "/landing", destination: `${landingUrl}/landing` },
      { source: "/landing/:path+", destination: `${landingUrl}/landing/:path+` },
    ];
  },
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
