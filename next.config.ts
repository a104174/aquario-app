import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A app é local-first: o HTML de cada ecrã é estático e os dados vêm do
  // cliente (TanStack Query + IndexedDB). Assim o service worker pode
  // pré-cachear tudo e o arranque é instantâneo, mesmo offline.
  turbopack: {
    rules: {
      // CSS global passa pelo Tailwind. Os CSS Modules (*.module.css) ficam
      // de fora: senão saem como CSS global e as classes chegam vazias.
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/serwist/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
