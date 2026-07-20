export const BACKUP_SCHEMA_VERSION = 1;
export const PERFORMANCE_BUDGET_MS = 100;

export type BackupFrequency = "manual" | "hourly" | "daily" | "weekly";

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: BackupFrequency;
  timeOfDay?: string;
  dayOfWeek?: number;
  retentionCount: number;
  autoRestoreTest: boolean;
}

export interface BackupManifest {
  version: number;
  createdAt: string;
  schemaVersion: number;
  checksum: string;
  appVersion: string;
  deployChannel: string;
  releaseSlot: string;
  dbNames: string[];
  recordCounts: Record<string, number>;
  totalSizeBytes: number;
}

export interface BackupIntegrity {
  dbChecksums: Record<string, string>;
}

export interface BackupDatabases {
  [dbName: string]: Record<string, unknown[]>;
}

export interface BackupFile {
  manifest: BackupManifest;
  databases: BackupDatabases;
  integrity: BackupIntegrity;
}

export interface BackupMetadata {
  id: string;
  createdAt: string;
  checksum: string;
  recordCount: number;
  totalSizeBytes: number;
  schemaVersion: number;
  deployChannel: string;
}

export interface StoreResult {
  storeName: string;
  records: number;
  ok: boolean;
  error?: string;
}

export interface RestoreReport {
  ok: boolean;
  storesAttempted: number;
  storesSucceeded: number;
  storesFailed: number;
  totalRecordsRestored: number;
  durationMs: number;
  results: StoreResult[];
  error?: string;
}

export interface VerifyReport {
  ok: boolean;
  checksumOk: boolean;
  schemaOk: boolean;
  consistencyOk: boolean;
  storeCount: number;
  errors: string[];
  durationMs: number;
}

export type BackupEventType =
  | "backup-created"
  | "backup-failed"
  | "restore-completed"
  | "restore-failed"
  | "verify-failed"
  | "schedule-missed";

export interface BackupEvent {
  type: BackupEventType;
  timestamp: string;
  details: string;
  backupId?: string;
  durationMs?: number;
}

export interface BackupRestoreTelemetryPayload {
  ok: boolean;
  eventType: BackupEventType;
  durationMs: number;
  recordCount: number;
  totalSizeBytes: number;
  deployChannel: string;
  error?: string;
  reportedAt: string;
}
