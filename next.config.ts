import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle that the desktop app ships.
  output: "standalone",
  // Cache Components stays off: requests hang on Cloudflare Workers (OpenNext) with it on.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
