"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getScheduler, type DistributedScheduler } from "@/src/services/jobScheduler";
import type { JobDefinition, SchedulerEvent, SchedulerMetrics, WorkerIdentity } from "@/src/lib/scheduler/types";
import type { CanaryGateResult } from "@/src/lib/scheduler/scheduler";

export interface UseJobSchedulerOptions {
  runOnMount?: boolean;
  intervalMs?: number;
  scheduler?: DistributedScheduler;
}

export function useJobScheduler(options: UseJobSchedulerOptions = {}) {
  const {
    runOnMount = true,
    intervalMs = 0,
    scheduler = getScheduler(),
  } = options;

  const subscribe = useCallback(
    (onStoreChange: () => void) => scheduler.subscribe(() => onStoreChange()),
    [scheduler],
  );

  const getSnapshot = useCallback(() => scheduler, [scheduler]);

  useSyncExternalStore(subscribe, getSnapshot, () => null);

  const submitJob = useCallback(
    (def: JobDefinition) => scheduler.submit(def),
    [scheduler],
  );

  const claimJob = useCallback(
    (workerId: string, jobId: string, leaseDurationMs: number) =>
      scheduler.claimJob({ workerId, jobId, leaseDurationMs, claimedAt: Date.now() }),
    [scheduler],
  );

  const completeJob = useCallback(
    (jobId: string, result: unknown) => scheduler.completeJob(jobId, result, Date.now()),
    [scheduler],
  );

  const failJob = useCallback(
    (jobId: string, error: string) => scheduler.failJob(jobId, error),
    [scheduler],
  );

  const registerWorker = useCallback(
    (identity: WorkerIdentity) => scheduler.registerWorker(identity),
    [scheduler],
  );

  const unregisterWorker = useCallback(
    (workerId: string) => scheduler.unregisterWorker(workerId),
    [scheduler],
  );

  const getAllJobs = useCallback(() => scheduler.getAllJobs(), [scheduler]);

  const getMetrics = useCallback((): SchedulerMetrics => scheduler.getMetrics(), [scheduler]);

  const checkCanaryGate = useCallback((): CanaryGateResult => scheduler.checkCanaryGate(), [scheduler]);

  const getWorkers = useCallback((): WorkerIdentity[] => scheduler.getWorkers(), [scheduler]);

  const getEventHistory = useCallback((): SchedulerEvent[] => scheduler.getEventHistory(), [scheduler]);

  useEffect(() => {
    if (!runOnMount) return;
    const timer = setTimeout(() => scheduler.start(), 0);
    return () => clearTimeout(timer);
  }, [runOnMount, scheduler]);

  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;
    const id = window.setInterval(() => scheduler.getMetrics(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, scheduler]);

  return {
    submitJob,
    claimJob,
    completeJob,
    failJob,
    registerWorker,
    unregisterWorker,
    getAllJobs,
    getMetrics,
    checkCanaryGate,
    getWorkers,
    getEventHistory,
    scheduler,
  };
}