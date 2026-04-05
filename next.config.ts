import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large request bodies for video processing responses
  experimental: {},
  // Increase the body size limit for API routes that return file data
  serverExternalPackages: [],
};

export default nextConfig;
