import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les packages du monorepo sont en TypeScript : Next.js les compile.
  transpilePackages: ["@artsyde/ui", "@artsyde/db"],
};

export default nextConfig;
