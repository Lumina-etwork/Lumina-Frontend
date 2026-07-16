"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { AuditReport, CanaryAnalysisResult } from "@/src/lib/config";
import {
  getConfigAuditor,
  type ConfigAuditor,
} from "@/src/services/configAudit";
import { reportConfigDrift } from "@/src/utils/configDriftTelemetry";

const DEFAULT_INTERVAL_MS = 60_000;

export interface UseConfigAuditOptions {
  /** When true, run an immediate system-wide audit on mount. */
  runOnMount?: boolean;
  /** Periodic audit interval; set 0 to disable. */
  intervalMs?: number;
  /** Forward drift findings to telemetry. */
  reportTelemetry?: boolean;
  auditor?: ConfigAuditor;
}

export function useConfigAudit(options: UseConfigAuditOptions = {}) {
  const {
    runOnMount = true,
    intervalMs = DEFAULT_INTERVAL_MS,
    reportTelemetry = true,
    auditor = getConfigAuditor(),
  } = options;

  const subscribe = useCallback(
    (onStoreChange: () => void) => auditor.subscribe(() => onStoreChange()),
    [auditor],
  );

  const getSnapshot = useCallback(
    () => auditor.getLastReport(),
    [auditor],
  );

  const lastReport = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [canary, setCanary] = useState<CanaryAnalysisResult | null>(null);

  const runAudit = useCallback((): AuditReport => {
    const report = auditor.auditAll();
    setCanary(auditor.analyzeCanaryPromotion());
    if (reportTelemetry && !report.ok) {
      void reportConfigDrift(report);
    }
    return report;
  }, [auditor, reportTelemetry]);

  useEffect(() => {
    if (!runOnMount) return;
    const timer = setTimeout(() => runAudit(), 0);
    return () => clearTimeout(timer);
  }, [runOnMount, runAudit]);

  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;
    const id = window.setInterval(() => {
      runAudit();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, runAudit]);

  return {
    lastReport,
    canary,
    history: auditor.getHistory(),
    runAudit,
    auditor,
  };
}
