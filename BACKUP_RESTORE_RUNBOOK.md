# Backup & Restore Runbook

## Purpose

Operator procedures for client-side IndexedDB backup creation, restore operations, scheduled backups, and alerting.

## Monitoring

| Signal | Source | Alert when |
|--------|--------|------------|
| Backup failure | `BackupEvent` (`backup-failed`) | Consecutive failures ≥ 3 |
| Restore failure | `RestoreReport` (`ok === false`) | Any restore failure |
| Verification failure | `VerifyReport` (`ok === false`) | Any checksum mismatch or structural error |
| Schedule missed | Time-based check | No backup in > 2× scheduled interval |
| Storage quota | `navigator.storage.estimate()` | Usage > 80% of quota |

### Dashboard

Open `/dashboard/backup-restore` to inspect:

- Current backup status and last event,
- Backup history table (date, record count, size, deploy channel),
- Schedule configuration (frequency, time, retention),
- Download/create/restore actions.

### Log alerts

The telemetry route logs:

- `console.error` for failed backup/restore events,
- `console.info` for successful events.

Wire log drains (CloudWatch, Datadog, etc.) to these messages for paging.

## Triage

1. Open `/dashboard/backup-restore`.
2. Check **Last Event** for the most recent backup/restore status.
3. For a **backup failure**:
   - Check browser storage quota (`navigator.storage.estimate()` via dev console).
   - Verify IndexedDB is accessible (not in private/incognito mode with restrictions).
   - Check for large datasets causing excessive serialization time.
4. For a **restore failure**:
   - Verify the backup file has not been corrupted (checksum validation).
   - Check that the backup schema version matches the current app version.
   - Ensure no browser storage quota limits are hit during restore.
5. For a **verification failure**:
   - Re-download the backup from a known-good source.
   - Run `verifyBackup()` from the dashboard to get detailed error messages.
6. Confirm `withinBudget` is true on verification; if not, consider reducing dataset size.

## Scheduled Backups

1. Open `/dashboard/backup-restore`.
2. Toggle the **Backup Schedule** switch to enable.
3. Configure:
   - **Frequency**: Hourly, Daily, or Weekly.
   - **Time**: HH:mm format (used for daily/weekly).
   - **Day of Week**: Applies to weekly frequency (0=Sunday).
   - **Keep**: Number of most recent backups to retain (oldest are auto-deleted).
4. The scheduler checks once per minute whether the time/day constraints are met.
5. Manual backups can be triggered at any time via **Create Backup** or **Download Backup**.

### Retention Policy

When a new backup is created, the oldest backups exceeding the configured retention count are automatically removed from the metadata index (backup files on disk are not affected).

## Restore Procedure

1. Open `/dashboard/backup-restore`.
2. Click **Restore from File** to open the restore wizard.
3. **Step 1 — Select**: Choose a `.json` backup file from disk.
4. **Step 2 — Verify**: The file is automatically validated:
   - SHA-256 checksum verification,
   - Schema version compatibility check,
   - Store presence validation (all expected stores present),
   - Data consistency checks (required fields present).
5. **Step 3 — Confirm**: Review the verification result and proceed.
   - The restore creates a pre-restore snapshot for rollback.
   - All existing data in the affected stores is replaced.
6. **Step 4 — Result**: Success/failure report with record counts and timing.

### Dry Run

To validate a backup without committing:

1. Call `uploadAndRestore(file, true)` via the API or dev console.
2. The verification runs and a report is returned.
3. No IndexedDB data is modified.

### Rollback

If a restore has unintended consequences:

1. The pre-restore snapshot is available in memory during the restore operation.
2. Call `rollbackRestore(snapshot)` to restore the previous state.
3. All stores are cleared and re-populated with the pre-restore data.

## Blue-Green Deployment

1. Deploy the new build to the **inactive** slot.
2. Before flipping traffic, verify backup/restore functionality on the inactive slot:
   - Create a backup and verify the manifest schema.
   - Run a restore test cycle to confirm data compatibility.
3. Flip traffic. Backups from the previous slot remain valid.
4. If rolling back, restore from a backup created before the deployment.

## Canary Analysis

1. Set `NEXT_PUBLIC_CANARY_PERCENT` to a small percentage (e.g., 5%).
2. Monitor backup/restore telemetry from the canary cohort.
3. Verify that backup schema versions remain compatible across slots.
4. Promotion requires zero restore failures and zero verification failures.
5. On success, promote canary → green → stable.

## Security Review Checklist

- [ ] Backup files may contain node configuration snapshots with API keys/tokens.
- [ ] Telemetry payloads carry metadata only (no raw record data).
- [ ] Restore validation rejects malformed backup files.
- [ ] Rollback capability prevents data loss during failed restores.
- [ ] No plaintext secrets in telemetry logs.
- [ ] Backup files should be stored securely or encrypted at rest.
