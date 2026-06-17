import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["recharts", "d3-scale"],
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        maxInitialRequests: 25,
        maxAsyncRequests: 25,
        minSize: 20000,
        cacheGroups: {
          "vendors-charts": {
            test: /[\\/]node_modules[\\/](recharts|d3-scale|d3-array|d3-format|d3-interpolate|d3-time|d3-time-format|d3-color|d3-shape|d3-path)[\\/]/,
            name: "vendors-charts",
            chunks: "all",
            priority: 30,
            reuseExistingChunk: true,
          },
          "vendors-crypto": {
            test: /[\\/]node_modules[\\/](stellar-sdk|soroban-client|stellar-base|sodium-native|sodium-universal|tweetnacl|axios|urijs|eventsource)[\\/]/,
            name: "vendors-crypto",
            chunks: "all",
            priority: 30,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "all",
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

export default async function getConfig(): Promise<NextConfig> {
  if (process.env.ANALYZE === "true") {
    try {
      const mod = await import("@next/bundle-analyzer");
      const withAnalyzer = mod.default({ enabled: true });
      return withAnalyzer(nextConfig);
    } catch {
      console.warn("@next/bundle-analyzer not available. Skipping bundle analysis.");
    }
  }
  return nextConfig;
}
