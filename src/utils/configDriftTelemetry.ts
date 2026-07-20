/**
 * Telemetry reporter for configuration drift events.
 * Mirrors stellar-error telemetry: best-effort POST with offline enqueue.
 */

import type { AuditReport } from "@/src/lib/config";
import { enqueueRequest } from "@/src/lib/offlineQueue";
import { installOfflineSync } from "@/src/lib/offlineSync";
import { enqueueError } from "@/src/lib/sentry/sentryClient";

const TELEMETRY_ENDPOINT = "/api/telemetry/config-drift";

export type ConfigDriftTelemetryPayload = {
  service: string;
  channel: string;
  baselineVersion: string;
  ok: boolean;
  findingCount: number;
  criticalCount: number;
  warningCount: number;
  durationMs: number;
  withinBudget: boolean;
  findings: AuditReport["findings"];
  reportedAt: string;
};

async function postPayload(payload: ConfigDriftTelemetryPayload): Promise<void> {
  if (typeof window === "undefined") return;

  const response = await fetch(TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!response.ok && response.status >= 500) {
    const error = new Error(`Config drift telemetry 5xx: ${response.status}`);
    await enqueueError(error, {
      component: "configDriftTelemetry",
      tags: { endpoint: TELEMETRY_ENDPOINT, status: String(response.status) },
      extra: { payload },
    });
    throw error;
  }
}

export async function reportConfigDrift(report: AuditReport): Promise<void> {
  if (typeof window === "undefined") return;
  if (report.ok) return;

  installOfflineSync();

  const payload: ConfigDriftTelemetryPayload = {
    service: report.service,
    channel: report.channel,
    baselineVersion: report.baselineVersion,
    ok: report.ok,
    findingCount: report.metrics.findingCount,
    criticalCount: report.metrics.criticalCount,
    warningCount: report.metrics.warningCount,
    durationMs: report.metrics.durationMs,
    withinBudget: report.metrics.withinBudget,
    findings: report.findings,
    reportedAt: new Date().toISOString(),
  };

  try {
    if (!window.navigator.onLine) {
      await enqueueRequest({
        url: TELEMETRY_ENDPOINT,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        source: "config-drift-audit",
      });
      return;
    }
    await postPayload(payload);
  } catch (error) {
    console.warn("Unable to report config drift", error);
    try {
      await enqueueRequest({
        url: TELEMETRY_ENDPOINT,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        source: "config-drift-audit",
      });
    } catch {
      // Swallow secondary enqueue failures; audit itself must not throw.
    }
  }
}
