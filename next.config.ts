import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native modules (resvg) niet door webpack laten bundelen
  serverExternalPackages: ["@resvg/resvg-js"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
