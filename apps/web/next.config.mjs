/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@declawd/shared'],
  // Required by apps/web/Dockerfile's runner stage, which copies
  // .next/standalone and runs `node apps/web/server.js`.
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
