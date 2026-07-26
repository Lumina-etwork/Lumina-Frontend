import type { SloMetricSample, SloObjective } from "./types";

export const sloObjectives: SloObjective[] = [
  {
    id: "critical-api-availability",
    name: "Critical API availability",
    service: "api-gateway",
    target: 0.9999,
    windowDays: 30,
    latencyP99TargetMs: 100,
    burnRateWarning: 2,
    burnRateCritical: 14,
  },
  {
    id: "wallet-signing-availability",
    name: "Wallet signing availability",
    service: "wallet-service",
    target: 0.9999,
    windowDays: 30,
    latencyP99TargetMs: 100,
    burnRateWarning: 2,
    burnRateCritical: 14,
  },
  {
    id: "horizon-ingest-availability",
    name: "Horizon ingest availability",
    service: "horizon-ingest",
    target: 0.9999,
    windowDays: 30,
    latencyP99TargetMs: 100,
    burnRateWarning: 2,
    burnRateCritical: 14,
  },
];

export const sloMetricSamples: SloMetricSample[] = [
  { timestamp: "2026-07-25T00:00:00Z", service: "api-gateway", goodEvents: 99998, totalEvents: 100000, latencyP99Ms: 88 },
  { timestamp: "2026-07-25T00:05:00Z", service: "wallet-service", goodEvents: 99990, totalEvents: 100000, latencyP99Ms: 74 },
  { timestamp: "2026-07-25T00:10:00Z", service: "horizon-ingest", goodEvents: 99999, totalEvents: 100000, latencyP99Ms: 117 },
];
