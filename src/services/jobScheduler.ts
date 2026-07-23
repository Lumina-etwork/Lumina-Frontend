import { DistributedScheduler, type SchedulerConfig } from "../lib/scheduler"
import type { Job, JobDefinition, SchedulerEvent, SchedulerMetrics, WorkerIdentity } from "../lib/scheduler/types"
import type { CanaryGateResult } from "../lib/scheduler/scheduler"

let globalScheduler: DistributedScheduler | null = null

export function getScheduler(config?: Partial<SchedulerConfig>): DistributedScheduler {
  if (!globalScheduler) {
    globalScheduler = new DistributedScheduler(config)
    globalScheduler.start()
  }
  return globalScheduler
}

export function resetSchedulerForTests(): void {
  if (globalScheduler) {
    globalScheduler.clear()
    globalScheduler = null
  }
}

export type { DistributedScheduler }
export type {
  Job,
  JobDefinition,
  SchedulerEvent,
  SchedulerMetrics,
  WorkerIdentity,
  CanaryGateResult,
}