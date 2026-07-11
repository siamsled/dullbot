import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@zxing/browser', '@zxing/library'],
};

export default nextConfig;
