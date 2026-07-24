/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@declawd/shared'],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
