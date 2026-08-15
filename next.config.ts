import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@zxing/browser', '@zxing/library'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'three'],
    // Keep already-visited dynamic (force-dynamic) pages in the client-side
    // router cache for 5 minutes. Default is 0s for dynamic routes, which
    // causes Next.js to re-fetch from the server and show the loading skeleton
    // on every tab switch — even when the user was just on that page seconds ago.
    staleTimes: {
      dynamic: 300, // seconds
      static: 300,
    },
  },
};

export default nextConfig;
