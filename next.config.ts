import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  reloadOnOnline: false,
  cacheOnNavigation: true,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    optimizePackageImports: ["recharts", "d3-scale", "d3"],
  },
  // Content-Security-Policy: defence-in-depth against XSS.
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|icons|manifest).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self' wss: https:",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
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
            test: /[\\/]node_modules[\\/](recharts|d3-scale|d3-array|d3-format|d3-interpolate|d3-time|d3-time-format|d3-color|d3-shape|d3-path|d3)[\\/]/,
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
