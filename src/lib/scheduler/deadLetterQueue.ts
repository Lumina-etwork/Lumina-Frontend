import type { DeadLetterEntry, DeadLetterReason, Job } from "./types"

export interface DeadLetterQueueOptions {
  maxEntries?: number
  now?: () => number
}

const DEFAULT_MAX_ENTRIES = 1_000

export class DeadLetterQueue<T = unknown> {
  private entries = new Map<string, DeadLetterEntry<T>>()
  private maxEntries: number
  private now: () => number

  constructor(options: DeadLetterQueueOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
    this.now = options.now ?? Date.now
  }

  enqueue(job: Job<T>, reason: DeadLetterReason, error?: string): DeadLetterEntry<T> {
    const entry: DeadLetterEntry<T> = {
      entryId: crypto.randomUUID(),
      job: { ...job, definition: { ...job.definition, payload: { ...job.definition.payload } } },
      reason,
      error: error ?? job.error,
      failedAt: this.now(),
      retryCount: job.retryCount,
    }

    this.entries.set(entry.entryId, entry)
    this.trimOldest()
    return entry
  }

  list(): DeadLetterEntry<T>[] {
    return Array.from(this.entries.values()).sort((a, b) => a.failedAt - b.failedAt)
  }

  get(entryId: string): DeadLetterEntry<T> | undefined {
    return this.entries.get(entryId)
  }

  remove(entryId: string): boolean {
    return this.entries.delete(entryId)
  }

  size(): number {
    return this.entries.size
  }

  clear(): void {
    this.entries.clear()
  }

  private trimOldest(): void {
    while (this.entries.size > this.maxEntries) {
      const oldest = this.list()[0]
      if (!oldest) return
      this.entries.delete(oldest.entryId)
    }
  }
}
