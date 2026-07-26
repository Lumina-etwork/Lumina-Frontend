import { NextResponse } from "next/server";
import { telemetryLogger, type LogSeverity } from "@/src/lib/logging";
import type { ConfigDriftTelemetryPayload } from "@/src/utils/configDriftTelemetry";

/**
 * Ingests config-drift audit telemetry for monitoring / alerting pipelines.
 * Does not persist secrets — payloads are expected to be pre-redacted.
 */
export async function POST(request: Request) {
  let payload: ConfigDriftTelemetryPayload;

  try {
    payload = (await request.json()) as ConfigDriftTelemetryPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  if (!payload || typeof payload.service !== "string") {
    return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
  }

  const level: LogSeverity =
    payload.criticalCount > 0
      ? "error"
      : payload.warningCount > 0
        ? "warn"
        : "info";

  telemetryLogger[level]("config.drift.detected", {
    "service.name": payload.service,
    "deployment.environment.name": payload.channel,
    "config.finding.count": payload.findingCount,
    "config.severity.critical": payload.criticalCount,
    "duration.ms": payload.durationMs,
    "slo.within_budget": payload.withinBudget,
    reportedAt: payload.reportedAt,
  });

  return NextResponse.json({ ok: true });
}
