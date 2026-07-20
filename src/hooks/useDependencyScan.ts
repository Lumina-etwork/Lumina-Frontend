"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { CanaryGateResult, ScanReport } from "@/src/lib/vulnerability";
import {
  getDependencyScanner,
  type DependencyScanner,
} from "@/src/services/dependencyScan";
import { reportVulnerabilityScan } from "@/src/utils/vulnerabilityTelemetry";

const DEFAULT_INTERVAL_MS = 3_600_000;

export interface UseDependencyScanOptions {
  /** When true, run an immediate system-wide scan on mount. */
  runOnMount?: boolean;
  /** Periodic scan interval in ms; set 0 to disable (default 1 hour). */
  intervalMs?: number;
  /** Forward findings to telemetry. */
  reportTelemetry?: boolean;
  scanner?: DependencyScanner;
}

export function useDependencyScan(
  options: UseDependencyScanOptions = {},
) {
  const {
    runOnMount = true,
    intervalMs = DEFAULT_INTERVAL_MS,
    reportTelemetry = true,
    scanner = getDependencyScanner(),
  } = options;

  const subscribe = useCallback(
    (onStoreChange: () => void) => scanner.subscribe(() => onStoreChange()),
    [scanner],
  );

  const getSnapshot = useCallback(
    () => scanner.getLastReport(),
    [scanner],
  );

  const lastReport = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [canary, setCanary] = useState<CanaryGateResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const runScan = useCallback(async (): Promise<ScanReport> => {
    setScanning(true);
    try {
      const report = await scanner.scanAll();
      setCanary(scanner.checkCanaryGate());
      if (reportTelemetry && !report.ok) {
        void reportVulnerabilityScan(report);
      }
      return report;
    } finally {
      setScanning(false);
    }
  }, [scanner, reportTelemetry]);

  useEffect(() => {
    if (!runOnMount) return;
    const timer = setTimeout(() => runScan(), 0);
    return () => clearTimeout(timer);
  }, [runOnMount, runScan]);

  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;
    const id = window.setInterval(() => {
      runScan();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, runScan]);

  return {
    lastReport,
    canary,
    history: scanner.getHistory(),
    runScan,
    scanning,
    scanner,
  };
}
