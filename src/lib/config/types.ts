/**
 * Shared types for runtime configuration auditing and drift detection.
 */

export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ConfigValue[]
  | { [key: string]: ConfigValue };

export type RuntimeConfigSnapshot = Record<string, ConfigValue>;

export type DriftSeverity = "critical" | "warning" | "info";

export type DeploymentChannel = "blue" | "green" | "canary" | "stable";

export interface DriftFinding {
  path: string;
  expected: ConfigValue;
  actual: ConfigValue;
  severity: DriftSeverity;
  service: string;
}

export interface AuditMetrics {
  /** Wall-clock duration of the last audit in milliseconds. */
  durationMs: number;
  /** Whether the audit stayed under the 100ms P99 budget. */
  withinBudget: boolean;
  findingCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  auditedAt: number;
}

export interface AuditReport {
  ok: boolean;
  findings: DriftFinding[];
  metrics: AuditMetrics;
  baselineVersion: string;
  channel: DeploymentChannel;
  service: string;
}

export interface ConfigSource {
  /** Logical service name (system-wide registry key). */
  service: string;
  /** Capture the live runtime configuration for this service. */
  capture: () => RuntimeConfigSnapshot;
}

export interface CanaryAnalysisResult {
  channel: DeploymentChannel;
  driftRate: number;
  criticalRate: number;
  sampleSize: number;
  promote: boolean;
  reason: string;
}

export const PERFORMANCE_BUDGET_MS = 100;
export const SENSITIVE_PATH_FRAGMENTS = [
  "apikey",
  "api_key",
  "secret",
  "password",
  "token",
  "privatekey",
  "private_key",
  "credential",
] as const;
