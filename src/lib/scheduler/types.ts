export type JobStatus = "pending" | "running" | "completed" | "failed" | "timed_out"
export type LeaseStatus = "active" | "expired" | "released"

export interface WorkerIdentity {
  workerId: string
  hostname?: string
  pid?: number
  startedAt: number
}

export interface JobDefinition {
  jobType: string
  priority: number
  payload: Record<string, unknown>
  maxRetries: number
  timeoutMs: number
}

export interface Job<T = unknown> {
  jobId: string
  definition: JobDefinition
  status: JobStatus
  result?: T
  error?: string
  retryCount: number
  createdAt: number
  startedAt?: number
  completedAt?: number
  claimedBy?: string
  leaseExpiresAt?: number
}

export interface Lease {
  leaseId: string
  jobId: string
  workerId: string
  status: LeaseStatus
  acquiredAt: number
  expiresAt: number
  heartbeatAt?: number
}

export interface WorkerClaim {
  workerId: string
  jobId: string
  leaseDurationMs: number
  claimedAt: number
}

export interface SchedulerMetrics {
  totalJobsSubmitted: number
  totalJobsCompleted: number
  totalJobsFailed: number
  activeLeases: number
  expiredLeases: number
  averageQueueTimeMs: number
  averageProcessingTimeMs: number
  p99ProcessingTimeMs: number
  throughputPerMinute: number
  workerCount: number
}

export type SchedulerEventType =
  | "job_submitted"
  | "job_started"
  | "job_completed"
  | "job_failed"
  | "job_timed_out"
  | "lease_acquired"
  | "lease_expired"
  | "lease_released"
  | "worker_registered"
  | "worker_disconnected"
  | "heartbeat_missed"

export interface SchedulerEvent {
  type: SchedulerEventType
  timestamp: number
  jobId?: string
  workerId?: string
  leaseId?: string
  metadata?: Record<string, unknown>
}

export interface SchedulerConfig {
  leaseDurationMs: number
  leaseRenewalThresholdMs: number
  heartbeatIntervalMs: number
  heartbeatTimeoutMs: number
  maxJobRetries: number
  defaultJobTimeoutMs: number
  queuePollIntervalMs: number
  maxConcurrentJobs: number
  historyRetentionCount: number
  performanceBudgetMs: number
}