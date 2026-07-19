/**
 * Canonical runtime configuration baselines for all audited services.
 * Expected values represent the declared desired state used for drift detection.
 */

import type { DeploymentChannel, RuntimeConfigSnapshot } from "./types";

export const BASELINE_VERSION = "2026.07.16";

export interface ServiceBaseline {
  service: string;
  /** Paths whose mismatch is treated as critical (security / connectivity). */
  criticalPaths: string[];
  /** Paths whose mismatch is warning-level. */
  warningPaths: string[];
  expected: RuntimeConfigSnapshot;
}

/** Default Soroban RPC client baseline (matches module defaults). */
export const SOROBAN_BASELINE: ServiceBaseline = {
  service: "soroban-rpc",
  criticalPaths: ["serverUrl", "networkPassphrase"],
  warningPaths: [],
  expected: {
    serverUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
};

/** API client / sync baseline. */
export const API_BASELINE: ServiceBaseline = {
  service: "api-client",
  criticalPaths: [],
  warningPaths: ["baseUrl"],
  expected: {
    baseUrl: "",
  },
};

/**
 * Allowed deployment channels. Intentional canary/blue/green are valid —
 * they must not be flagged as drift against a fixed "stable" expected value
 * (that would block canary promotion analysis).
 */
export const ALLOWED_DEPLOY_CHANNELS: readonly DeploymentChannel[] = [
  "stable",
  "blue",
  "green",
  "canary",
] as const;

/** Deployment channel / release-slot baseline for blue-green and canary. */
export const DEPLOYMENT_BASELINE: ServiceBaseline = {
  service: "deployment",
  // channel is validated via allowlist in the auditor, not fixed-value diff
  criticalPaths: [],
  warningPaths: ["releaseSlot"],
  expected: {
    // Intentionally empty of channel/canaryPercent — those are operational
    // controls validated separately so canary/blue-green deploys stay clean.
    releaseSlot: "blue",
  },
};

/** Mesh / network defaults used across dashboard services. */
export const MESH_BASELINE: ServiceBaseline = {
  service: "mesh-network",
  criticalPaths: [],
  warningPaths: ["maxPeers", "iceTimeoutMs"],
  expected: {
    maxPeers: 10,
    iceTimeoutMs: 5_000,
    maxMessageSize: 16_384,
  },
};

export const ALL_BASELINES: ServiceBaseline[] = [
  SOROBAN_BASELINE,
  API_BASELINE,
  DEPLOYMENT_BASELINE,
  MESH_BASELINE,
];

export function getBaseline(service: string): ServiceBaseline | undefined {
  return ALL_BASELINES.find((b) => b.service === service);
}
