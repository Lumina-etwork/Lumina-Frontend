import type {
  BackupFile,
  BackupManifest,
  VerifyReport,
} from "./types";
import { BACKUP_SCHEMA_VERSION } from "./types";
import { getKnownDbNames } from "./storage";

const REQUIRED_DBS = getKnownDbNames();
const REQUIRED_STORES: Record<string, string[]> = {
  "lumina-field-db": [
    "inspectionRecords",
    "nodeConfigSnapshots",
    "syncQueue",
    "syncMetadata",
    "horizonCursors",
  ],
  "lumina-offline-queue": ["outgoing-requests"],
};

/**
 * Compute SHA-256 hex digest of a string payload using the Web Crypto API.
 */
export async function computeChecksum(data: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(data),
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return "";
}

/**
 * Validates a backup manifest structure and returns a list of error messages.
 * Returns an empty array if the manifest is valid.
 */
export function validateManifest(manifest: BackupManifest): string[] {
  const errors: string[] = [];

  if (!manifest.version) {
    errors.push("manifest missing version");
  }
  if (!manifest.createdAt) {
    errors.push("manifest missing createdAt");
  } else if (isNaN(Date.parse(manifest.createdAt))) {
    errors.push("manifest createdAt is not a valid ISO date");
  }
  if (manifest.schemaVersion == null) {
    errors.push("manifest missing schemaVersion");
  } else if (manifest.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    errors.push(
      `schemaVersion mismatch: expected ${BACKUP_SCHEMA_VERSION}, got ${manifest.schemaVersion}`,
    );
  }
  if (!manifest.checksum) {
    errors.push("manifest missing checksum");
  }
  if (!manifest.appVersion) {
    errors.push("manifest missing appVersion");
  }
  if (!manifest.dbNames || manifest.dbNames.length === 0) {
    errors.push("manifest missing dbNames");
  }
  if (!manifest.recordCounts || typeof manifest.recordCounts !== "object") {
    errors.push("manifest missing or invalid recordCounts");
  }
  if (manifest.totalSizeBytes == null || manifest.totalSizeBytes < 0) {
    errors.push("manifest missing or invalid totalSizeBytes");
  }

  return errors;
}

/**
 * Validates that the backup contains all required databases and stores.
 * Returns a list of missing store references (e.g. "lumina-field-db/inspectionRecords").
 */
export function validateStorePresence(backup: BackupFile): string[] {
  const errors: string[] = [];
  const dbs = backup.databases ?? {};

  for (const dbName of REQUIRED_DBS) {
    if (!dbs[dbName]) {
      errors.push(`missing database: ${dbName}`);
      continue;
    }
    const expected = REQUIRED_STORES[dbName] ?? [];
    for (const storeName of expected) {
      if (!(storeName in dbs[dbName])) {
        errors.push(`missing store: ${dbName}/${storeName}`);
      }
    }
  }

  return errors;
}

/**
 * Performs consistency checks across stores within the backup.
 * Returns a list of issues found.
 */
export function checkConsistency(backup: BackupFile): string[] {
  const errors: string[] = [];
  const dbs = backup.databases ?? {};

  // Check that all inspectionRecords have required fields
  const inspRecords = dbs["lumina-field-db"]?.inspectionRecords ?? [];
  for (let i = 0; i < inspRecords.length; i++) {
    const rec = inspRecords[i] as Record<string, unknown>;
    if (!rec.nodeId) {
      errors.push(`inspectionRecords[${i}] missing nodeId`);
    }
    if (!rec.technicianId) {
      errors.push(`inspectionRecords[${i}] missing technicianId`);
    }
  }

  // Check that all nodeConfigSnapshots have required fields
  const configSnaps = dbs["lumina-field-db"]?.nodeConfigSnapshots ?? [];
  for (let i = 0; i < configSnaps.length; i++) {
    const rec = configSnaps[i] as Record<string, unknown>;
    if (!rec.nodeId) {
      errors.push(`nodeConfigSnapshots[${i}] missing nodeId`);
    }
    if (rec.config == null) {
      errors.push(`nodeConfigSnapshots[${i}] missing config`);
    }
  }

  // Check that syncQueue entries reference valid collections
  const syncEntries = dbs["lumina-field-db"]?.syncQueue ?? [];
  for (let i = 0; i < syncEntries.length; i++) {
    const rec = syncEntries[i] as Record<string, unknown>;
    if (
      rec.collection &&
      rec.collection !== "inspectionRecords" &&
      rec.collection !== "nodeConfigSnapshots"
    ) {
      errors.push(`syncQueue[${i}] references unknown collection: ${rec.collection}`);
    }
  }

  return errors;
}

/**
 * Full verification of a backup file.
 */
export async function verifyBackup(backup: BackupFile): Promise<VerifyReport> {
  const start = performance.now();
  const errors: string[] = [];

  // 1. Validate manifest
  const manifestErrors = validateManifest(backup.manifest);
  errors.push(...manifestErrors);

  // 2. Validate store presence
  const presenceErrors = validateStorePresence(backup);
  errors.push(...presenceErrors);

  // 3. Check consistency
  const consistencyErrors = checkConsistency(backup);
  errors.push(...consistencyErrors);

  // 4. Verify checksum if manifest has one
  let checksumOk = true;
  if (backup.manifest.checksum) {
    const recomputed = await computeChecksum(
      JSON.stringify({ databases: backup.databases, integrity: backup.integrity }),
    );
    checksumOk = recomputed === backup.manifest.checksum;
    if (!checksumOk) {
      errors.push("checksum mismatch");
    }
  }

  const durationMs = Math.round(performance.now() - start);
  const storeCount = Object.values(backup.databases ?? {}).reduce(
    (acc, db) => acc + Object.keys(db).length,
    0,
  );

  return {
    ok: errors.length === 0,
    checksumOk,
    schemaOk: manifestErrors.filter((e) => e.includes("schemaVersion")).length === 0,
    consistencyOk: consistencyErrors.length === 0,
    storeCount,
    errors,
    durationMs,
  };
}
