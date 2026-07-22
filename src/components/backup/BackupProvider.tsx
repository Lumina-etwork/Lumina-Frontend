"use client";

import { type ReactNode, useEffect } from "react";
import { getBackupRestoreManager } from "@/src/lib/backup";

interface BackupProviderProps {
  children: ReactNode;
  autoSchedule?: boolean;
}

export function BackupProvider({
  children,
  autoSchedule = true,
}: BackupProviderProps) {
  useEffect(() => {
    if (!autoSchedule) return;

    const manager = getBackupRestoreManager();
    const config = manager.getScheduleConfig();

    if (config.enabled && config.frequency !== "manual") {
      import("@/src/lib/backup/scheduler").then(({ registerSchedule }) => {
        registerSchedule(config, async () => {
          await manager.createBackup();
        });
      });
    }

    return () => {
      import("@/src/lib/backup/scheduler").then(({ unregisterSchedule }) => {
        unregisterSchedule();
      });
    };
  }, [autoSchedule]);

  return <>{children}</>;
}
