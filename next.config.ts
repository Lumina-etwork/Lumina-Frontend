import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // The Serwist worker source is authored in TypeScript under app/sw.ts so
  // it can live next to the rest of the App Router tree. Serwist compiles
  // it down to public/sw.js during `next build`.
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable the worker in development so HMR bundles are never cached —
  // the service worker would otherwise pin stale chunks and break the
  // Next.js dev server. Production builds always include the worker.
  disable: process.env.NODE_ENV !== "production",
  reloadOnOnline: false,
  cacheOnNavigation: true,
  // Cap is enforced at build time by Serwist; the SW never inspects it.
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});

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
            test: /[\\/]node_modules[\\/](?:@stellar[\\/](?:stellar-sdk|stellar-base)|stellar-sdk|soroban-client|stellar-base|sodium-native|sodium-universal|tweetnacl|axios|urijs|eventsource|randombytes)[\\/]/,
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
  const config = withSerwist(nextConfig);

  if (process.env.ANALYZE === "true") {
    try {
      const mod = await import("@next/bundle-analyzer");
      const withAnalyzer = mod.default({ enabled: true });
      return withAnalyzer(config);
    } catch {
      console.warn(
        "@next/bundle-analyzer not available. Skipping bundle analysis.",
      );
    }
  }

  return config;
}
