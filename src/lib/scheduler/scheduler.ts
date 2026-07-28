import type {
  Job,
  JobDefinition,
  SchedulerConfig,
  SchedulerEvent,
  SchedulerMetrics,
  SchedulerEventType,
  DeadLetterEntry,
  DeadLetterReason,
  WorkerClaim,
  WorkerIdentity,
} from "./types"
import { JobStore } from "./jobStore"
import { LeaseManager } from "./leaseManager"
import { SchedulerMetricsCollector } from "./metrics"
import { DeadLetterQueue } from "./deadLetterQueue"

export type SchedulerListener = (event: SchedulerEvent) => void

export const DEFAULT_CONFIG: SchedulerConfig = {
  leaseDurationMs: 30_000,
  leaseRenewalThresholdMs: 10_000,
  heartbeatIntervalMs: 5_000,
  heartbeatTimeoutMs: 15_000,
  maxJobRetries: 3,
  defaultJobTimeoutMs: 60_000,
  queuePollIntervalMs: 1_000,
  maxConcurrentJobs: 10,
  historyRetentionCount: 100,
  deadLetterRetentionCount: 1_000,
  performanceBudgetMs: 100,
}

export type CanaryGateResult = {
  pass: boolean
  activeLeases: number
  expiredLeases: number
  failureRate: number
  p99ProcessingMs: number
}

export class DistributedScheduler {
  private jobStore: JobStore
  private leaseManager: LeaseManager
  private metrics: SchedulerMetricsCollector
  private deadLetterQueue: DeadLetterQueue
  private listeners = new Set<SchedulerListener>()
  private config: SchedulerConfig
  private eventHistory: SchedulerEvent[] = []
  private timerId: ReturnType<typeof setInterval> | null = null
  private started = false

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.jobStore = new JobStore()
    this.leaseManager = new LeaseManager(this.jobStore)
    this.metrics = new SchedulerMetricsCollector()
    this.deadLetterQueue = new DeadLetterQueue({ maxEntries: this.config.deadLetterRetentionCount })
  }

  submit(def: JobDefinition): Job {
    const job = this.jobStore.submit(def)
    this.metrics.recordSubmission()
    this.emit("job_submitted", { jobId: job.jobId })
    return job
  }

  registerWorker(identity: WorkerIdentity): void {
    this.leaseManager.registerWorker(identity)
    this.emit("worker_registered", { workerId: identity.workerId })
  }

  unregisterWorker(workerId: string): void {
    this.leaseManager.unregisterWorker(workerId)
    this.emit("worker_disconnected", { workerId })
  }

  claimJob(claim: WorkerClaim): { job: Job; lease: import("./types").Lease } | null {
    const result = this.leaseManager.claimJob(claim)
    if (result) {
      this.jobStore.updateStatus(result.job.jobId, "running", {
        startedAt: claim.claimedAt,
        claimedBy: claim.workerId,
        leaseExpiresAt: result.lease.expiresAt,
      })
      this.emit("lease_acquired", { jobId: result.job.jobId, workerId: claim.workerId, leaseId: result.lease.leaseId })
    }
    return result
  }

  completeJob(jobId: string, result: unknown, now: number): void {
    this.jobStore.complete(jobId, result, now)
    this.metrics.recordCompletion(this.jobStore.get(jobId)!, now)
    this.emit("job_completed", { jobId })
  }

  failJob(jobId: string, error: string): void {
    this.jobStore.fail(jobId, error)
    this.metrics.recordFailure()
    const job = this.jobStore.get(jobId)
    if (job?.status === "failed") {
      this.moveToDeadLetter(jobId, "max_retries_exceeded", error)
      return
    }
    this.emit("job_failed", { jobId, metadata: { error } })
  }

  getJob(jobId: string): Job | undefined {
    return this.jobStore.get(jobId)
  }

  getJobsByStatus(status: import("./types").JobStatus): Job[] {
    return this.jobStore.getByStatus(status)
  }

  getAllJobs(): Job[] {
    return this.jobStore.getAll()
  }

  getDeadLetterQueue(): DeadLetterEntry[] {
    return this.deadLetterQueue.list()
  }

  requeueDeadLetter(entryId: string): Job | null {
    const entry = this.deadLetterQueue.get(entryId)
    if (!entry) return null

    const job = entry.job
    this.deadLetterQueue.remove(entryId)
    this.jobStore.updateStatus(job.jobId, "pending", {
      error: undefined,
      completedAt: undefined,
      claimedBy: undefined,
      startedAt: undefined,
      leaseExpiresAt: undefined,
    })
    this.emit("job_requeued_from_dead_letter", { jobId: job.jobId, metadata: { entryId } })
    return this.jobStore.get(job.jobId) ?? null
  }

  moveToDeadLetter(jobId: string, reason: DeadLetterReason, error?: string): DeadLetterEntry | null {
    const job = this.jobStore.get(jobId)
    if (!job) return null

    this.jobStore.updateStatus(jobId, "dead_lettered", { error, completedAt: Date.now() })
    const deadLettered = this.jobStore.get(jobId)!
    const entry = this.deadLetterQueue.enqueue(deadLettered, reason, error)
    this.metrics.recordDeadLetter()
    this.emit("job_dead_lettered", { jobId, metadata: { entryId: entry.entryId, reason, error } })
    return entry
  }

  getMetrics(): SchedulerMetrics {
    return this.metrics.getMetrics(
      this.jobStore,
      this.leaseManager,
    )
  }

  checkCanaryGate(): CanaryGateResult {
    const m = this.getMetrics()
    const total = m.totalJobsCompleted + m.totalJobsFailed
    const failureRate = total > 0 ? m.totalJobsFailed / total : 0
    return {
      pass: failureRate < 0.05 && m.p99ProcessingTimeMs < this.config.performanceBudgetMs,
      activeLeases: m.activeLeases,
      expiredLeases: m.expiredLeases,
      failureRate: Math.round(failureRate * 10000) / 10000,
      p99ProcessingMs: m.p99ProcessingTimeMs,
    }
  }

  getWorkers(): WorkerIdentity[] {
    return this.leaseManager.getWorkers()
  }

  subscribe(listener: SchedulerListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(): void {
    if (this.started) return
    this.started = true
    const tick = () => {
      const now = Date.now()
      const expiredLeases = this.leaseManager.expireStaleLeases(now, this.config.leaseDurationMs)
      for (const leaseId of expiredLeases) {
        const lease = this.leaseManager.getLease(leaseId)
        if (lease) {
          this.jobStore.timeoutExpiredLeases(now, this.config.leaseDurationMs)
          if (this.jobStore.get(lease.jobId)?.status === "timed_out") {
            this.moveToDeadLetter(lease.jobId, "lease_expired", "Lease expired")
          }
          this.emit("lease_expired", { leaseId, jobId: lease.jobId, workerId: lease.workerId })
        }
      }
      const timedOutJobs = this.jobStore.timeoutJobs(now)
      for (const jobId of timedOutJobs) {
        if (this.jobStore.get(jobId)?.status === "failed") {
          this.moveToDeadLetter(jobId, "max_retries_exceeded", this.jobStore.get(jobId)?.error)
        }
        this.emit("job_timed_out", { jobId })
      }
    }
    this.timerId = setInterval(tick, this.config.queuePollIntervalMs)
  }

  stop(): void {
    this.started = false
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  isStarted(): boolean {
    return this.started
  }

  getEventHistory(): SchedulerEvent[] {
    return [...this.eventHistory]
  }

  clear(): void {
    this.stop()
    this.jobStore.clear()
    this.leaseManager.clear()
    this.metrics.reset()
    this.deadLetterQueue.clear()
    this.eventHistory = []
    this.listeners.clear()
  }

  private emit(type: SchedulerEventType, extra: Partial<SchedulerEvent>): void {
    const event: SchedulerEvent = { type, timestamp: Date.now(), ...extra }
    this.eventHistory.push(event)
    if (this.eventHistory.length > this.config.historyRetentionCount) {
      this.eventHistory.shift()
    }
    for (const listener of this.listeners) {
      try { listener(event) } catch {}
    }
  }
}