/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // npm run build:ci-check builds into .next/ci-check so it never replaces the normal build in .next
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // The bilingual draft PDF (M5 D2) is rendered on the server by @react-pdf/renderer: load it from node_modules
    // instead of bundling it, and ship the embedded Noto Sans files with the project routes that render it.
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    outputFileTracingIncludes: { '/api/projects/**': ['./lib/pdf/fonts/**'] }
  }
};

export default nextConfig;
