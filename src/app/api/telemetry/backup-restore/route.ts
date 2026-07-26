import { NextResponse } from "next/server";
import { telemetryLogger } from "@/src/lib/logging";
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

  const level = !payload.ok ? "error" : "info";

  telemetryLogger[level]("backup_restore.event", {
    "event.category": payload.eventType,
    "event.outcome": payload.ok ? "success" : "failure",
    "duration.ms": payload.durationMs,
    "backup.record.count": payload.recordCount,
    "backup.size.bytes": payload.totalSizeBytes,
    "deployment.environment.name": payload.deployChannel,
    "error.message": payload.error,
    reportedAt: payload.reportedAt,
  });

  return NextResponse.json({ ok: true });
}
