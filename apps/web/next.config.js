/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pns/sdk"],
  webpack: (config) => {
    // Required for @polkadot/wasm-crypto in Next.js
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      path: false,
    };
    return config;
  },
};

module.exports = nextConfig;
