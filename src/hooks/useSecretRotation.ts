"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getSecretRotationService, type SecretRotationService } from "@/src/services/secretRotation";
import type { RotationReport } from "@/src/lib/secretRotation";

export function useSecretRotation(service: SecretRotationService = getSecretRotationService()) {
  const subscribe = useCallback((onStoreChange: () => void) => service.subscribe(onStoreChange), [service]);
  const getSnapshot = useCallback(() => service.getLastReport(), [service]);
  const lastReport = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const runAssessment = useCallback((): RotationReport => service.assess(), [service]);

  useEffect(() => {
    const timer = setTimeout(() => runAssessment(), 0);
    return () => clearTimeout(timer);
  }, [runAssessment]);

  return { lastReport, runAssessment };
}
