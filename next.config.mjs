/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // npm run build:ci-check builds into .next/ci-check so it never replaces the normal build in .next
  distDir: process.env.NEXT_DIST_DIR || '.next'
};

export default nextConfig;
