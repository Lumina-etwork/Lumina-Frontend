export interface BandwidthFrame {
  timestamp: number
  value: number
}

export const BURST_THRESHOLD = 10
export const NORMAL_FRAMES_PER_TICK = 1
export const CATCH_UP_FRAMES_PER_TICK = 2
export const MAX_FRAMES_PER_TICK = 5
export const MAX_PENDING_FRAMES = 10_000

export interface DrainResult {
  frames: BandwidthFrame[]
  catchUp: boolean
  dropped: number
}

/**
 * Smooths WebSocket reconnect bursts into bounded animation-frame work.
 *
 * The queue deliberately advances visible data more slowly than producers can
 * write it. This prevents a reconnect burst from either forcing dozens of
 * synchronous canvas renders or being collapsed into a single visual jump.
 */
export class BandwidthFrameQueue {
  private readonly pending: BandwidthFrame[] = []
  private readonly pendingTimestamps = new Set<number>()
  private droppedSinceLastDrain = 0

  enqueue(frame: BandwidthFrame): void {
    if (this.pendingTimestamps.has(frame.timestamp)) return

    this.pending.push(frame)
    this.pendingTimestamps.add(frame.timestamp)
    this.pending.sort((a, b) => a.timestamp - b.timestamp)

    while (this.pending.length > MAX_PENDING_FRAMES) {
      const dropped = this.pending.shift()
      if (dropped) {
        this.pendingTimestamps.delete(dropped.timestamp)
        this.droppedSinceLastDrain += 1
      }
    }
  }

  enqueueMany(frames: BandwidthFrame[]): void {
    frames.forEach((frame) => this.enqueue(frame))
  }

  drain(): DrainResult {
    const catchUp = this.isCatchingUp()
    const requested = catchUp ? CATCH_UP_FRAMES_PER_TICK : NORMAL_FRAMES_PER_TICK
    const limit = Math.min(requested, MAX_FRAMES_PER_TICK)
    const frames = this.pending.splice(0, limit)

    frames.forEach((frame) => this.pendingTimestamps.delete(frame.timestamp))

    const dropped = this.droppedSinceLastDrain
    this.droppedSinceLastDrain = 0

    return { frames, catchUp, dropped }
  }

  isCatchingUp(): boolean {
    return this.pending.length > BURST_THRESHOLD
  }

  get size(): number {
    return this.pending.length
  }

  clear(): void {
    this.pending.length = 0
    this.pendingTimestamps.clear()
    this.droppedSinceLastDrain = 0
  }
}
