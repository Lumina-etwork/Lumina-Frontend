import type { Job, SchedulerMetrics } from "./types"
import { SlidingWindow } from "../slidingWindow"
import { JobStore } from "./jobStore"

interface ProcessingRecord {
  timestamp: number
  durationMs: number
}

export class SchedulerMetricsCollector {
  private completedJobs = 0
  private failedJobs = 0
  private submittedJobs = 0
  private processingTimes: number[] = []
  private queueTimes: number[] = []
  private throughputWindow: SlidingWindow<{ timestamp: number; value: number }>

  constructor() {
    this.throughputWindow = new SlidingWindow(60)
  }

  recordSubmission(): void {
    this.submittedJobs++
  }

  recordCompletion(job: Job, now: number): void {
    this.completedJobs++
    this.throughputWindow.push({ timestamp: now, value: 1 })
    if (job.startedAt) {
      this.processingTimes.push(now - job.startedAt)
    }
    if (job.createdAt) {
      this.queueTimes.push((job.startedAt ?? now) - job.createdAt)
    }
  }

  recordFailure(): void {
    this.failedJobs++
  }

  getMetrics(jobStore: JobStore, leaseManager: { getActiveLeaseCount: () => number; getExpiredLeaseCount: () => number; getWorkerCount: () => number }, now: number): SchedulerMetrics {
    const sortedProcessing = [...this.processingTimes].sort((a, b) => a - b)
    const sortedQueue = [...this.queueTimes].sort((a, b) => a - b)

    const avgProcessing = sortedProcessing.length > 0
      ? sortedProcessing.reduce((a, b) => a + b, 0) / sortedProcessing.length
      : 0
    const avgQueue = sortedQueue.length > 0
      ? sortedQueue.reduce((a, b) => a + b, 0) / sortedQueue.length
      : 0
    const p99Processing = sortedProcessing.length > 0
      ? sortedProcessing[Math.floor(sortedProcessing.length * 0.99)]
      : 0

    const recentThroughput = this.throughputWindow.getAll()
    const throughputPerMinute = recentThroughput.length

    return {
      totalJobsSubmitted: this.submittedJobs,
      totalJobsCompleted: this.completedJobs,
      totalJobsFailed: this.failedJobs,
      activeLeases: leaseManager.getActiveLeaseCount(),
      expiredLeases: leaseManager.getExpiredLeaseCount(),
      averageQueueTimeMs: Math.round(avgQueue),
      averageProcessingTimeMs: Math.round(avgProcessing),
      p99ProcessingTimeMs: Math.round(p99Processing),
      throughputPerMinute,
      workerCount: leaseManager.getWorkerCount(),
    }
  }

  reset(): void {
    this.completedJobs = 0
    this.failedJobs = 0
    this.submittedJobs = 0
    this.processingTimes = []
    this.queueTimes = []
    this.throughputWindow.clear()
  }
}