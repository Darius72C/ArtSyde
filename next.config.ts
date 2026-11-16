import type { NextConfig } from "next";

// The storage's public address (R2_PUBLIC_URL), whose images the optimizer may resize; the current one as fallback.
const storageHosts = [...new Set([process.env.R2_PUBLIC_URL, "https://pub-d6e72e0c48144248890493f250b8be8f.r2.dev"].filter(Boolean).map((u) => new URL(u as string).hostname))];

const nextConfig: NextConfig = {
  // Product photos, banners and prints come from the storage: resized and served as WebP by /_next/image (see
  // src/lib/imageUrl.ts). Their names never change (a new upload gets a new name), so they are cached a month.
  images: {
    remotePatterns: storageHosts.map((hostname) => ({ protocol: "https", hostname })),
    qualities: [75],
    formats: ["image/webp"],
    minimumCacheTTL: 2678400,
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The service worker (public/sw.js, the PWA): never cached by the browser or the CDN, so an update reaches
  // everyone on their next visit; scripts from this site only.
  async headers() {
    return [
      // The mannequins (/models): kept a day, then refreshed in the background, instead of re-checked on every visit.
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
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
