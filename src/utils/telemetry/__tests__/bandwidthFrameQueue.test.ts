import assert from 'node:assert/strict'
import {
  BandwidthFrameQueue,
  BURST_THRESHOLD,
  CATCH_UP_FRAMES_PER_TICK,
  MAX_FRAMES_PER_TICK,
} from '../bandwidthFrameQueue'

const queue = new BandwidthFrameQueue()
const burst = Array.from({ length: 100 }, (_, index) => ({
  timestamp: 1_000 + index,
  value: index,
})).reverse()

queue.enqueueMany(burst)
assert.equal(queue.size, 100)
assert.equal(queue.isCatchingUp(), true)
assert.ok(BURST_THRESHOLD < 100)

const drainedTimestamps: number[] = []
let catchUpTicks = 0

while (queue.size > 0) {
  const result = queue.drain()
  assert.ok(result.frames.length <= MAX_FRAMES_PER_TICK)

  if (result.catchUp) {
    catchUpTicks += 1
    assert.ok(
      result.frames.length <= CATCH_UP_FRAMES_PER_TICK,
      'catch-up rendering must never jump by more than two frame widths',
    )
  }

  drainedTimestamps.push(...result.frames.map((frame) => frame.timestamp))
}

assert.ok(catchUpTicks > 0)
assert.equal(drainedTimestamps.length, 100)
assert.deepEqual(
  drainedTimestamps,
  Array.from({ length: 100 }, (_, index) => 1_000 + index),
  'a reconnect burst must be drained in chronological order without missing frames',
)

for (let index = 1; index < drainedTimestamps.length; index += 1) {
  assert.equal(
    drainedTimestamps[index] - drainedTimestamps[index - 1],
    1,
    'a 100-frame reconnect burst must not introduce a visual gap',
  )
}

const duplicateQueue = new BandwidthFrameQueue()
duplicateQueue.enqueue({ timestamp: 42, value: 1 })
duplicateQueue.enqueue({ timestamp: 42, value: 999 })
assert.equal(duplicateQueue.size, 1)
assert.deepEqual(duplicateQueue.drain().frames, [{ timestamp: 42, value: 1 }])

const normalQueue = new BandwidthFrameQueue()
normalQueue.enqueue({ timestamp: 7, value: 3 })
const normalDrain = normalQueue.drain()
assert.equal(normalDrain.catchUp, false)
assert.equal(normalDrain.frames.length, 1)

console.log('bandwidthFrameQueue tests passed')
