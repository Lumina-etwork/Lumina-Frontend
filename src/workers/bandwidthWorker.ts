
import { drawBandwidthChart } from '../components/dashboard/chart/d3Renderer'
import type { BandwidthDataPoint } from '../hooks/useBandwidthStream'
import { BandwidthFrameQueue } from '../utils/telemetry/bandwidthFrameQueue'

let canvas: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null
let width = 0
let height = 0

const dataBuffer: BandwidthDataPoint[] = []
const maxBufferCapacity = 300
const pendingFrames = new BandwidthFrameQueue()

let needsRedraw = false
let isDecimated = false

const localRaf = typeof requestAnimationFrame !== 'undefined'
  ? requestAnimationFrame
  : (cb: (...args: unknown[]) => void) => setTimeout(cb, 16)

function appendFrames(frames: BandwidthDataPoint[]) {
  frames.forEach((pt) => {
    const exists = dataBuffer.some((d) => d.timestamp === pt.timestamp)
    if (!exists) dataBuffer.push(pt)
  })

  dataBuffer.sort((a, b) => a.timestamp - b.timestamp)
  while (dataBuffer.length > maxBufferCapacity) dataBuffer.shift()
}

function tick() {
  const drained = pendingFrames.drain()

  if (drained.frames.length > 0) {
    appendFrames(drained.frames)
    isDecimated = drained.catchUp
    needsRedraw = true
  } else if (pendingFrames.size === 0) {
    isDecimated = false
  }

  if (needsRedraw && ctx && canvas) {
    drawBandwidthChart(ctx, dataBuffer, width, height, isDecimated)
    needsRedraw = false
  }

  localRaf(tick)
}

tick()

self.onmessage = (e: MessageEvent) => {
  const { type } = e.data

  if (type === 'init') {
    canvas = e.data.canvas
    width = e.data.width
    height = e.data.height
    if (canvas) {
      ctx = canvas.getContext('2d')
      needsRedraw = true
    }
  } else if (type === 'resize') {
    width = e.data.width
    height = e.data.height
    if (canvas) {
      canvas.width = width
      canvas.height = height
      needsRedraw = true
    }
  } else if (type === 'data') {
    const points: BandwidthDataPoint[] = Array.isArray(e.data.data) ? e.data.data : [e.data.data]
    pendingFrames.enqueueMany(points)
    isDecimated = pendingFrames.isCatchingUp()
  }
}
