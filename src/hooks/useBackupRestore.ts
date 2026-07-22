"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getBackupRestoreManager,
  type BackupRestoreManager,
  type BackupFile,
  type BackupMetadata,
  type BackupEvent,
  type BackupScheduleConfig,
  type RestoreReport,
  type VerifyReport,
} from "@/src/lib/backup";

export interface UseBackupRestoreOptions {
  runOnMount?: boolean;
  autoSchedule?: boolean;
  manager?: BackupRestoreManager;
}

export function useBackupRestore(options: UseBackupRestoreOptions = {}) {
  const {
    runOnMount = true,
    autoSchedule = true,
    manager = getBackupRestoreManager(),
  } = options;

  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [lastEvent, setLastEvent] = useState<BackupEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<BackupScheduleConfig>(
    () => manager.getScheduleConfig(),
  );

  const refreshBackups = useCallback(() => {
    setBackups(manager.listBackups());
  }, [manager]);

  const createBackup = useCallback(async (): Promise<BackupFile | null> => {
    setIsCreating(true);
    try {
      const result = await manager.createBackup();
      refreshBackups();
      return result;
    } finally {
      setIsCreating(false);
    }
  }, [manager, refreshBackups]);

  const restoreBackup = useCallback(
    async (file: BackupFile, dryRun?: boolean): Promise<RestoreReport> => {
      setIsRestoring(true);
      try {
        const result = await manager.restoreBackup(file, dryRun);
        return result;
      } finally {
        setIsRestoring(false);
      }
    },
    [manager],
  );

  const verifyBackup = useCallback(
    async (file: BackupFile): Promise<VerifyReport> => {
      return manager.verifyBackup(file);
    },
    [manager],
  );

  const deleteBackup = useCallback(
    (id: string) => {
      manager.deleteBackup(id);
      refreshBackups();
    },
    [manager, refreshBackups],
  );

  const updateSchedule = useCallback(
    (config: BackupScheduleConfig) => {
      manager.updateScheduleConfig(config);
      setScheduleConfig(config);
    },
    [manager],
  );

  const downloadBackup = useCallback(
    async (name?: string) => {
      const file = await createBackup();
      if (!file) return;

      const blob = new Blob([JSON.stringify(file, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name ?? `lumina-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [createBackup],
  );

  const uploadAndRestore = useCallback(
    async (file: File, dryRun?: boolean): Promise<RestoreReport | null> => {
      try {
        const text = await file.text();
        const backup = JSON.parse(text) as BackupFile;
        return restoreBackup(backup, dryRun);
      } catch (err) {
        return {
          ok: false,
          storesAttempted: 0,
          storesSucceeded: 0,
          storesFailed: 1,
          totalRecordsRestored: 0,
          durationMs: 0,
          results: [],
          error: err instanceof Error ? err.message : "Invalid backup file",
        };
      }
    },
    [restoreBackup],
  );

  const runRestoreTest = useCallback(
    async (file: BackupFile): Promise<RestoreReport> => {
      return manager.runRestoreTest(file);
    },
    [manager],
  );

  useEffect(() => {
    if (!runOnMount) return;
    refreshBackups();
  }, [runOnMount, refreshBackups]);

  useEffect(() => {
    const unsub = manager.subscribe((event) => {
      setLastEvent(event);
      if (event.type === "backup-created" || event.type === "backup-failed") {
        refreshBackups();
      }
    });
    return unsub;
  }, [manager, refreshBackups]);

  useEffect(() => {
    if (!autoSchedule) return;
    import("@/src/lib/backup/scheduler").then(({ registerSchedule }) => {
      const cfg = manager.getScheduleConfig();
      if (cfg.enabled && cfg.frequency !== "manual") {
        registerSchedule(cfg, async () => {
          await manager.createBackup();
        });
      }
    });
    return () => {
      import("@/src/lib/backup/scheduler").then(({ unregisterSchedule }) => {
        unregisterSchedule();
      });
    };
  }, [autoSchedule, manager]);

  return {
    backups,
    lastBackup: backups.length > 0 ? backups[0] : null,
    lastEvent,
    isCreating,
    isRestoring,
    scheduleConfig,
    createBackup,
    restoreBackup,
    verifyBackup,
    deleteBackup,
    updateSchedule,
    downloadBackup,
    uploadAndRestore,
    runRestoreTest,
    refreshBackups,
  };
}
