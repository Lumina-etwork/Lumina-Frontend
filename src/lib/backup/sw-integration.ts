/**
 * Service Worker integration for backup scheduling.
 *
 * Provides helper functions for registering periodic backup sync events
 * in the Service Worker context. These are meant to be called from the
 * SW's `message` event handler or from the main thread via postMessage.
 */

/**
 * Registers a periodic sync event for backup tasks.
 * Falls back to a setInterval-based approach if periodicSync is not supported.
 */
export async function registerPeriodicSync(
  swRegistration: ServiceWorkerRegistration,
  config: { enabled: boolean; frequency: "hourly" | "daily" | "weekly" },
): Promise<void> {
  if (!config.enabled) {
    await unregisterPeriodicSync(swRegistration);
    return;
  }

  const minInterval = getMinIntervalMs(config.frequency);

  // Try the Periodic Sync API first
  if ("periodicSync" in swRegistration) {
    try {
      const ps = (swRegistration as any).periodicSync as {
        register: (tag: string, options: { minInterval: number }) => Promise<void>;
        unregister: (tag: string) => Promise<void>;
        getTags: () => Promise<string[]>;
      };

      await ps.register("backup-db", {
        minInterval,
      });
      return;
    } catch {
      // PeriodicSync not available or permission denied — fall through to setInterval
    }
  }

  // Fallback: send message to SW to start interval-based scheduling
  const sw = swRegistration.active;
  if (sw) {
    sw.postMessage({
      type: "register-backup-interval",
      minInterval,
    });
  }
}

/**
 * Unregisters a previously registered periodic sync.
 */
export async function unregisterPeriodicSync(
  swRegistration: ServiceWorkerRegistration,
): Promise<void> {
  if ("periodicSync" in swRegistration) {
    try {
      const ps = (swRegistration as any).periodicSync as {
        unregister: (tag: string) => Promise<void>;
      };
      await ps.unregister("backup-db");
    } catch {
      // ignore
    }
  }

  const sw = swRegistration.active;
  if (sw) {
    sw.postMessage({ type: "unregister-backup-interval" });
  }
}

function getMinIntervalMs(frequency: "hourly" | "daily" | "weekly"): number {
  switch (frequency) {
    case "hourly":
      return 60 * 60 * 1000;
    case "daily":
      return 24 * 60 * 60 * 1000;
    case "weekly":
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export type SwBackupMessage =
  | { type: "backup-created" }
  | { type: "backup-failed"; error: string }
  | { type: "register-backup-interval"; minInterval: number }
  | { type: "unregister-backup-interval" };
