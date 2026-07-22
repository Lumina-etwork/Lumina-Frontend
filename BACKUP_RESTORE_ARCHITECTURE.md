# Scheduled Database Backup & Restore Testing

## Overview

Lumina Frontend now includes a system-wide IndexedDB backup and restore framework that:

- exports all client-side database records (inspection records, node config snapshots, sync queue, sync metadata, Horizon cursor caches, outgoing request queue) into downloadable JSON backup files,
- verifies backup integrity via SHA-256 checksums and structural validation,
- restores backup files back into IndexedDB with dry-run and rollback support,
- runs scheduled backups via configurable intervals (hourly, daily, weekly),
- enforces a **<100ms P99** budget on critical verification paths,
- supports **blue-green** release slots and **canary** promotion validation.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  IndexedDB (lumina-field-db, lumina-offline-queue)             │
│  inspectionRecords, nodeConfigSnapshots, syncQueue,            │
│  syncMetadata, horizonCursors, outgoing-requests               │
└──────────────────────────┬─────────────────────────────────────┘
                           │ exportDatabase()
                           ▼
┌────────────────────────────────────────────────────────────────┐
│  BackupRestoreManager (src/lib/backup/index.ts)                │
│  - createBackup / restoreBackup / verifyBackup                 │
│  - listBackups / deleteBackup                                  │
│  - schedule management + retention                             │
│  - subscriber event system                                     │
└──────┬─────────────────────────────────────┬──────────────────-┘
       │                                     │
       ▼                                     ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│  Verify Engine           │    │  Restore Engine             │
│  src/lib/backup/verify.ts│    │  src/lib/backup/restore-test│
│  - computeChecksum       │    │  - runRestoreTest           │
│  - validateManifest      │    │  - restoreBackup            │
│  - validateStorePresence │    │  - rollbackRestore          │
│  - checkConsistency      │    │  - restoreTestCycle         │
└──────────────────────────┘    └─────────────────────────────┘
```

## Components

| Path | Role |
|------|------|
| `src/lib/backup/types.ts` | Shared types, schema version, performance budget |
| `src/lib/backup/storage.ts` | IndexedDB export/import, localStorage metadata index |
| `src/lib/backup/verify.ts` | Checksum, manifest, presence, consistency verification |
| `src/lib/backup/restore-test.ts` | Dry-run, restore with rollback, full restore cycle |
| `src/lib/backup/index.ts` | Orchestrator, singleton manager, event system |
| `src/lib/backup/scheduler.ts` | Interval-based scheduling with time/day constraints |
| `src/lib/backup/sw-integration.ts` | Service Worker periodic sync helpers |
| `src/hooks/useBackupRestore.ts` | React hook for backup/restore state and actions |
| `src/components/backup/BackupDashboard.tsx` | Operator dashboard |
| `src/components/backup/RestoreWizard.tsx` | Multi-step restore flow |
| `src/components/backup/BackupProvider.tsx` | App-wide scheduler wiring |
| `src/app/dashboard/backup-restore/page.tsx` | Dashboard page |
| `src/app/api/telemetry/backup-restore/route.ts` | Monitoring ingest endpoint |
| `src/utils/backupRestoreTelemetry.ts` | Telemetry reporter |

## Performance

- Critical path: `verifyBackup` / `restoreTestCycle` (sync checksum + structural validation).
- Budget: `PERFORMANCE_BUDGET_MS = 100`. Measurements are reported in telemetry.
- Backup creation is permitted to be slower (<500ms) since it is not on a UI-critical path.
- Verification must not perform network I/O; all checks are local IndexedDB reads and in-memory computation.

## Security

- Backup files may contain node configuration snapshots with sensitive fields (API keys, tokens).
- The `BackupRestoreManager` does not automatically redact — consumers should call `redactSnapshot()` from the config audit system before attaching backups to telemetry.
- The telemetry ingest route never persists raw backup data; it logs only metadata (duration, record count, ok/error).
- Restore validation rejects malformed backup files, preventing injection of invalid data.

## Availability

- Backup failures (IndexedDB unavailable, quota exceeded) produce events but never throw.
- The scheduler degrades gracefully when `localStorage` is unavailable (SSR, privacy mode).
- Restore operations create a pre-restore snapshot so rollback is always possible.
- The system operates entirely client-side; no external service dependencies for core functionality.

## Deployment Channels

Runtime channel is read from:

- `NEXT_PUBLIC_DEPLOY_CHANNEL` — `stable` \| `blue` \| `green` \| `canary`
- `NEXT_PUBLIC_RELEASE_SLOT` — active slot (`blue` / `green`)
- `NEXT_PUBLIC_CANARY_PERCENT` — traffic share for canary analysis

Backup manifests record the deploy channel at creation time. Restore operations validate schema version compatibility across slots.

See `BACKUP_RESTORE_RUNBOOK.md` for promotion and rollback procedures.

## Backup File Format

```jsonc
{
  "manifest": {
    "version": 1,
    "createdAt": "2026-07-20T12:00:00.000Z",
    "schemaVersion": 1,
    "checksum": "sha256-hex-digest",
    "appVersion": "0.1.0",
    "deployChannel": "stable",
    "releaseSlot": "blue",
    "dbNames": ["lumina-field-db", "lumina-offline-queue"],
    "recordCounts": {
      "lumina-field-db/inspectionRecords": 42,
      "lumina-field-db/nodeConfigSnapshots": 12,
      "lumina-field-db/syncQueue": 0,
      "lumina-field-db/syncMetadata": 2,
      "lumina-field-db/horizonCursors": 3,
      "lumina-offline-queue/outgoing-requests": 1
    },
    "totalSizeBytes": 12345
  },
  "databases": { /* per-DB map of store-name → records[] */ },
  "integrity": {
    "dbChecksums": {
      "lumina-field-db": "sha256-hex",
      "lumina-offline-queue": "sha256-hex"
    }
  }
}
```
