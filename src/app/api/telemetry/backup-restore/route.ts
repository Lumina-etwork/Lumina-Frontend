import { NextResponse } from "next/server";
import type { BackupRestoreTelemetryPayload } from "@/src/lib/backup/types";

/**
 * Ingests backup-restore telemetry events for monitoring / alerting pipelines.
 * Mirrors the config-drift telemetry route pattern.
 */
export async function POST(request: Request) {
  let payload: BackupRestoreTelemetryPayload;

  try {
    payload = (await request.json()) as BackupRestoreTelemetryPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  if (!payload || !payload.eventType) {
    return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
  }

  const level =
    !payload.ok
      ? "error"
      : "info";

  const log =
    level === "error"
      ? console.error
      : console.info;

  log("Backup/Restore event", {
    eventType: payload.eventType,
    ok: payload.ok,
    durationMs: payload.durationMs,
    recordCount: payload.recordCount,
    totalSizeBytes: payload.totalSizeBytes,
    deployChannel: payload.deployChannel,
    error: payload.error,
    reportedAt: payload.reportedAt,
  });

  return NextResponse.json({ ok: true });
}
