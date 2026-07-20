import type { BackupRestoreTelemetryPayload, BackupEventType } from "@/src/lib/backup/types";
import { enqueueRequest } from "@/src/lib/offlineQueue";
import { installOfflineSync } from "@/src/lib/offlineSync";

const TELEMETRY_ENDPOINT = "/api/telemetry/backup-restore";

async function postPayload(payload: BackupRestoreTelemetryPayload): Promise<void> {
  if (typeof window === "undefined") return;

  const response = await fetch(TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!response.ok && response.status >= 500) {
    console.warn("Backup telemetry 5xx:", response.status);
  }
}

export async function reportBackupEvent(
  eventType: BackupEventType,
  opts: {
    ok: boolean;
    durationMs: number;
    recordCount: number;
    totalSizeBytes: number;
    deployChannel?: string;
    error?: string;
  },
): Promise<void> {
  if (typeof window === "undefined") return;

  installOfflineSync();

  const payload: BackupRestoreTelemetryPayload = {
    ok: opts.ok,
    eventType,
    durationMs: opts.durationMs,
    recordCount: opts.recordCount,
    totalSizeBytes: opts.totalSizeBytes,
    deployChannel: opts.deployChannel ?? "stable",
    error: opts.error,
    reportedAt: new Date().toISOString(),
  };

  try {
    if (!window.navigator.onLine) {
      await enqueueRequest({
        url: TELEMETRY_ENDPOINT,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        source: "backup-restore",
      });
      return;
    }
    await postPayload(payload);
  } catch {
    try {
      await enqueueRequest({
        url: TELEMETRY_ENDPOINT,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        source: "backup-restore",
      });
    } catch {
      // Swallow secondary failures
    }
  }
}
