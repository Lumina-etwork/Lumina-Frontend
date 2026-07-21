/**
 * Canary analysis helpers for blue-green / canary release gates.
 */

import type {
  AuditReport,
  CanaryAnalysisResult,
  DeploymentChannel,
} from "./types";

export const CANARY_MAX_CRITICAL_RATE = 0;
export const CANARY_MAX_DRIFT_RATE = 0.05;
export const CANARY_MIN_SAMPLES = 3;

/**
 * Evaluate whether a canary (or green) slot should be promoted based on
 * recent audit reports. Pure function — safe for tests and dashboards.
 */
export function analyzeCanary(
  reports: AuditReport[],
  channel: DeploymentChannel = "canary",
): CanaryAnalysisResult {
  const samples = reports.filter((r) => r.channel === channel);
  const sampleSize = samples.length;

  if (sampleSize < CANARY_MIN_SAMPLES) {
    return {
      channel,
      driftRate: 0,
      criticalRate: 0,
      sampleSize,
      promote: false,
      reason: `Insufficient samples (${sampleSize}/${CANARY_MIN_SAMPLES})`,
    };
  }

  const drifted = samples.filter((r) => !r.ok).length;
  const critical = samples.filter((r) => r.metrics.criticalCount > 0).length;
  const driftRate = drifted / sampleSize;
  const criticalRate = critical / sampleSize;

  if (criticalRate > CANARY_MAX_CRITICAL_RATE) {
    return {
      channel,
      driftRate,
      criticalRate,
      sampleSize,
      promote: false,
      reason: `Critical drift rate ${criticalRate.toFixed(2)} exceeds ${CANARY_MAX_CRITICAL_RATE}`,
    };
  }

  if (driftRate > CANARY_MAX_DRIFT_RATE) {
    return {
      channel,
      driftRate,
      criticalRate,
      sampleSize,
      promote: false,
      reason: `Drift rate ${driftRate.toFixed(2)} exceeds ${CANARY_MAX_DRIFT_RATE}`,
    };
  }

  return {
    channel,
    driftRate,
    criticalRate,
    sampleSize,
    promote: true,
    reason: "Canary within promotion thresholds",
  };
}
