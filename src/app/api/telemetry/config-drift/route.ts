import { NextResponse } from "next/server";
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

  const level =
    payload.criticalCount > 0
      ? "error"
      : payload.warningCount > 0
        ? "warn"
        : "info";

  const log =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.info;

  log("Config drift detected", {
    service: payload.service,
    channel: payload.channel,
    findingCount: payload.findingCount,
    criticalCount: payload.criticalCount,
    durationMs: payload.durationMs,
    withinBudget: payload.withinBudget,
    reportedAt: payload.reportedAt,
  });

  return NextResponse.json({ ok: true });
}
