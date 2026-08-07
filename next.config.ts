import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@zxing/browser', '@zxing/library'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'three'],
  },
};

export default nextConfig;
