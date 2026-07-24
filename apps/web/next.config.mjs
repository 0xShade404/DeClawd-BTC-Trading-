/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@declawd/shared'],
  // 'standalone' output is required by apps/web/Dockerfile's runner stage
  // (which copies .next/standalone and runs `node apps/web/server.js`) for
  // self-hosted/Docker deployment. Vercel's build pipeline packages
  // serverless functions itself and doesn't use .next/standalone - it sets
  // the VERCEL env var during every build, so this is skipped there rather
  // than left on, which can leave static assets out of Vercel's function
  // trace and break asset serving.
  output: process.env.VERCEL ? undefined : 'standalone',
  experimental: {
    typedRoutes: false,
  },
  // RainbowKit's Base Account connector pulls in @coinbase/cdp-sdk, which
  // statically imports optional @x402/* payment-protocol packages that we
  // don't install (DeClawd doesn't use x402 payments) and that are only
  // ever required behind a runtime feature check. Webpack still tries to
  // resolve them at build time, so they're explicitly ignored here rather
  // than pulling in an unused dependency tree.
  webpack: (config, { webpack }) => {
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    // MetaMask SDK (pulled in by wagmi's injected connector) optionally
    // supports React Native, which we don't target on the web.
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^@react-native-async-storage\/async-storage$/ }),
    );
    return config;
  },
};

export default nextConfig;
