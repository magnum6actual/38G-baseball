import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // External packages that should not be bundled
  serverExternalPackages: ['better-sqlite3', 'sqlite-vec'],
};

export default nextConfig;
