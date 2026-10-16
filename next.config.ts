import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle that the desktop app ships.
  output: "standalone",
  cacheComponents: true,
  // partialPrefetching is off: in Next 16.4 dev it put catch-all routes like
  // /paper/[...id] into an endless full-page reload loop.
  partialPrefetching: false,
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
