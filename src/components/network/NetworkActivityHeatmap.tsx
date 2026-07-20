'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWebSocket } from '@/src/hooks/useWebSocket'
import { useCanvasResize } from '@/src/hooks/useCanvasResize'
import type {
  NetworkActivityData,
  NetworkActivityMessage,
  TimeRange,
  HeatmapCell,
  TrafficArc,
} from '@/src/types/network'
import { TIME_RANGE_LABELS } from '@/src/types/network'

interface ArcParticle {
  arcIndex: number
  progress: number
  speed: number
}

const GRID_RESOLUTION = 0.1
const WORLD_WIDTH = 360
const WORLD_HEIGHT = 180
const PADDING = 40

const TIME_RANGES: TimeRange[] = ['realtime', '1h', '6h', '24h']

const REGION_COLORS = [
  '#0f766e', '#2563eb', '#7c3aed', '#db2777',
  '#ca8a04', '#ea580c', '#059669', '#0284c7',
]

function latLngToXY(
  lat: number,
  lng: number,
  width: number,
  height: number
): [number, number] {
  const x = PADDING + ((lng + 180) / WORLD_WIDTH) * (width - 2 * PADDING)
  const y = PADDING + ((90 - lat) / WORLD_HEIGHT) * (height - 2 * PADDING)
  return [x, y]
}

function heatmapColor(value: number, maxValue: number): string {
  if (maxValue === 0) return 'rgba(0,0,0,0)'
  const t = Math.min(value / maxValue, 1)
  const r = Math.round(t * 255)
  const g = Math.round((1 - t) * 200)
  const b = Math.round((1 - t) * 255)
  const a = 0.3 + t * 0.5
  return `rgba(${r},${g},${b},${a})`
}

function drawGridCell(
  ctx: CanvasRenderingContext2D,
  cellLat: number,
  cellLng: number,
  count: number,
  maxCount: number,
  width: number,
  height: number
) {
  const [x1, y1] = latLngToXY(cellLat, cellLng, width, height)
  const [x2, y2] = latLngToXY(
    cellLat + GRID_RESOLUTION,
    cellLng + GRID_RESOLUTION,
    width,
    height
  )
  const cellW = Math.max(x2 - x1, 2)
  const cellH = Math.max(y2 - y1, 2)

  ctx.fillStyle = heatmapColor(count, maxCount)
  ctx.fillRect(x1, y1, cellW, cellH)
}

function drawArc(
  ctx: CanvasRenderingContext2D,
  sourceLat: number,
  sourceLng: number,
  targetLat: number,
  targetLng: number,
  color: string,
  width: number,
  height: number,
  alpha: number
) {
  const [sx, sy] = latLngToXY(sourceLat, sourceLng, width, height)
  const [tx, ty] = latLngToXY(targetLat, targetLng, width, height)

  const midX = (sx + tx) / 2
  const dy = ty - sy
  const dx = tx - sx
  const distance = Math.sqrt(dx * dx + dy * dy)
  const arcHeight = Math.max(distance * 0.3, 30)
  const cpY = (sy + ty) / 2 - arcHeight

  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.quadraticCurveTo(midX, cpY, tx, ty)
  ctx.strokeStyle = color
  ctx.globalAlpha = alpha * 0.4
  ctx.lineWidth = Math.max(1.5, Math.min(4, distance / 80))
  ctx.stroke()
  ctx.globalAlpha = 1
}

function getArcPoint(
  sourceLat: number,
  sourceLng: number,
  targetLat: number,
  targetLng: number,
  progress: number,
  width: number,
  height: number
): [number, number] {
  const [sx, sy] = latLngToXY(sourceLat, sourceLng, width, height)
  const [tx, ty] = latLngToXY(targetLat, targetLng, width, height)

  const midX = (sx + tx) / 2
  const dy = ty - sy
  const dx = tx - sx
  const distance = Math.sqrt(dx * dx + dy * dy)
  const arcHeight = Math.max(distance * 0.3, 30)
  const cpY = (sy + ty) / 2 - arcHeight

  const t = progress
  const oneMinusT = 1 - t
  const px = oneMinusT * oneMinusT * sx + 2 * oneMinusT * t * midX + t * t * tx
  const py = oneMinusT * oneMinusT * sy + 2 * oneMinusT * t * cpY + t * t * ty
  return [px, py]
}

export interface NetworkActivityHeatmapProps {
  wsUrl?: string
  height?: number
}

export function NetworkActivityHeatmap({
  wsUrl = 'wss://api.lumina.network/ws/v1/network/activity',
  height = 600,
}: NetworkActivityHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('realtime')
  const [activityData, setActivityData] = useState<NetworkActivityData | null>(null)
  const particlesRef = useRef<ArcParticle[]>([])
  const animFrameRef = useRef<number>(0)
  const messagesRef = useRef<NetworkActivityMessage[]>([])
  const lastUpdateRef = useRef(0)

  const handleMessage = useCallback((msg: NetworkActivityMessage) => {
    messagesRef.current.push(msg)
    if (messagesRef.current.length > 5000) {
      messagesRef.current = messagesRef.current.slice(-2500)
    }
  }, [])

  const useMock = typeof window !== 'undefined' && wsUrl.includes('localhost')
  const wsConfig = useMock
    ? { url: 'ws://mock', reconnect: false }
    : { url: wsUrl, reconnect: true, maxReconnectAttempts: 5, reconnectDelayMs: 2000 }

  const { state: wsState } = useWebSocket<NetworkActivityMessage>(
    wsConfig,
    useMock ? () => {} : handleMessage
  )

  const state = useMock ? 'connected' : wsState

  const aggregatedData = useMemo((): NetworkActivityData | null => {
    const msgs = messagesRef.current
    if (msgs.length === 0) return null

    const now = Date.now()
    const windowMs =
      timeRange === 'realtime' ? 5 * 60 * 1000
      : timeRange === '1h' ? 60 * 60 * 1000
      : timeRange === '6h' ? 6 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000

    const cutoff = now - windowMs
    const relevantMessages = msgs.filter(m => m.timestamp >= cutoff)

    const cellMap = new Map<string, number>()
    const nodeSet = new Set<string>()
    const arcMap = new Map<string, {
      sourceLat: number
      sourceLng: number
      targetLat: number
      targetLng: number
      count: number
    }>()

    for (const msg of relevantMessages) {
      const srcLat = Math.floor(msg.sourceLat / GRID_RESOLUTION) * GRID_RESOLUTION
      const srcLng = Math.floor(msg.sourceLng / GRID_RESOLUTION) * GRID_RESOLUTION
      const srcKey = `${srcLat},${srcLng}`
      cellMap.set(srcKey, (cellMap.get(srcKey) || 0) + msg.messageCount)

      const tgtLat = Math.floor(msg.targetLat / GRID_RESOLUTION) * GRID_RESOLUTION
      const tgtLng = Math.floor(msg.targetLng / GRID_RESOLUTION) * GRID_RESOLUTION
      const tgtKey = `${tgtLat},${tgtLng}`
      cellMap.set(tgtKey, (cellMap.get(tgtKey) || 0) + msg.messageCount)

      nodeSet.add(msg.nodeId)

      const arcKey = `${Math.floor(msg.sourceLat * 10)},${Math.floor(msg.sourceLng * 10)}-${Math.floor(msg.targetLat * 10)},${Math.floor(msg.targetLng * 10)}`
      const existing = arcMap.get(arcKey)
      if (existing) {
        existing.count += msg.messageCount
      } else {
        arcMap.set(arcKey, {
          sourceLat: msg.sourceLat,
          sourceLng: msg.sourceLng,
          targetLat: msg.targetLat,
          targetLng: msg.targetLng,
          count: msg.messageCount,
        })
      }
    }

    const cells: HeatmapCell[] = []
    for (const [key, count] of cellMap) {
      const [latStr, lngStr] = key.split(',')
      cells.push({
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
        count,
        weight: count,
      })
    }

    const arcEntries = Array.from(arcMap.entries())
    const topArcs = arcEntries
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 50)

    const arcs: TrafficArc[] = topArcs.map(([key, val], i) => ({
      id: key,
      sourceLat: val.sourceLat,
      sourceLng: val.sourceLng,
      targetLat: val.targetLat,
      targetLng: val.targetLng,
      messageCount: val.count,
      color: REGION_COLORS[i % REGION_COLORS.length],
    }))

    return {
      cells,
      arcs,
      messageCount: relevantMessages.reduce((s, m) => s + m.messageCount, 0),
      activeNodes: nodeSet.size,
      timestamp: now,
    }
  }, [timeRange, state])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx || !activityData) return

    const w = canvas.width
    const h = canvas.height
    if (w === 0 || h === 0) return

    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = '#f7f4ee'
    ctx.fillRect(0, 0, w, h)

    const graticuleSpacing = 30
    ctx.strokeStyle = '#e8e0d4'
    ctx.lineWidth = 0.5
    for (let lat = -90; lat <= 90; lat += graticuleSpacing) {
      const y = PADDING + ((90 - lat) / WORLD_HEIGHT) * (h - 2 * PADDING)
      ctx.beginPath()
      ctx.moveTo(PADDING, y)
      ctx.lineTo(w - PADDING, y)
      ctx.stroke()
    }
    for (let lng = -180; lng <= 180; lng += graticuleSpacing) {
      const x = PADDING + ((lng + 180) / WORLD_WIDTH) * (w - 2 * PADDING)
      ctx.beginPath()
      ctx.moveTo(x, PADDING)
      ctx.lineTo(x, h - PADDING)
      ctx.stroke()
    }

    const continentOutlines = [
      { lat: 35, lng: -10 }, { lat: 36, lng: -5 }, { lat: 43, lng: 0 }, { lat: 47, lng: 3 }, { lat: 51, lng: 5 }, { lat: 55, lng: 2 }, { lat: 58, lng: -5 }, { lat: 58, lng: -10 }, { lat: 55, lng: -15 }, { lat: 50, lng: -18 }, { lat: 45, lng: -15 }, { lat: 38, lng: -10 }, { lat: 35, lng: -10 },
      { lat: 35, lng: -80 }, { lat: 30, lng: -75 }, { lat: 25, lng: -70 }, { lat: 20, lng: -65 }, { lat: 15, lng: -60 }, { lat: 10, lng: -55 }, { lat: 5, lng: -50 }, { lat: 0, lng: -45 }, { lat: -5, lng: -40 }, { lat: -10, lng: -35 }, { lat: -15, lng: -30 }, { lat: -20, lng: -25 }, { lat: -25, lng: -20 }, { lat: -30, lng: -15 }, { lat: -35, lng: -10 }, { lat: -40, lng: -5 }, { lat: -45, lng: 0 }, { lat: -50, lng: 5 }, { lat: -55, lng: 0 }, { lat: -50, lng: -5 }, { lat: -45, lng: -10 }, { lat: -40, lng: -15 }, { lat: -35, lng: -20 }, { lat: -30, lng: -25 }, { lat: -25, lng: -30 }, { lat: -20, lng: -35 }, { lat: -15, lng: -40 }, { lat: -10, lng: -45 }, { lat: -5, lng: -50 }, { lat: 0, lng: -55 }, { lat: 5, lng: -60 }, { lat: 10, lng: -65 }, { lat: 15, lng: -70 }, { lat: 20, lng: -75 }, { lat: 25, lng: -80 }, { lat: 30, lng: -85 }, { lat: 35, lng: -80 },
      { lat: -85, lng: 10 }, { lat: -80, lng: 15 }, { lat: -75, lng: 20 }, { lat: -70, lng: 25 }, { lat: -65, lng: 30 }, { lat: -60, lng: 35 }, { lat: -55, lng: 40 }, { lat: -50, lng: 45 }, { lat: -45, lng: 50 }, { lat: -40, lng: 55 }, { lat: -35, lng: 60 }, { lat: -30, lng: 65 }, { lat: -25, lng: 70 }, { lat: -20, lng: 75 }, { lat: -15, lng: 80 }, { lat: -10, lng: 85 }, { lat: -5, lng: 90 }, { lat: 0, lng: 95 }, { lat: -5, lng: 100 }, { lat: -10, lng: 105 }, { lat: -15, lng: 110 }, { lat: -20, lng: 115 }, { lat: -25, lng: 120 }, { lat: -30, lng: 125 }, { lat: -35, lng: 130 }, { lat: -40, lng: 135 }, { lat: -45, lng: 140 }, { lat: -50, lng: 145 }, { lat: -55, lng: 150 },
      { lat: 35, lng: 115 }, { lat: 30, lng: 120 }, { lat: 25, lng: 125 }, { lat: 20, lng: 130 }, { lat: 15, lng: 135 }, { lat: 10, lng: 140 }, { lat: 5, lng: 145 }, { lat: 0, lng: 150 }, { lat: -5, lng: 155 }, { lat: -10, lng: 160 }, { lat: -15, lng: 165 }, { lat: -20, lng: 170 }, { lat: -25, lng: 175 }, { lat: -30, lng: 180 },
      { lat: -170, lng: 60 }, { lat: -165, lng: 65 }, { lat: -160, lng: 70 }, { lat: -155, lng: 70 }, { lat: -150, lng: 65 }, { lat: -145, lng: 60 }, { lat: -140, lng: 55 }, { lat: -135, lng: 50 }, { lat: -130, lng: 45 }, { lat: -125, lng: 40 }, { lat: -120, lng: 35 }, { lat: -115, lng: 30 }, { lat: -110, lng: 25 }, { lat: -105, lng: 20 }, { lat: -100, lng: 15 }, { lat: -95, lng: 20 }, { lat: -90, lng: 25 }, { lat: -85, lng: 30 }, { lat: -80, lng: 35 }, { lat: -75, lng: 40 }, { lat: -70, lng: 45 }, { lat: -65, lng: 50 }, { lat: -60, lng: 55 }, { lat: -55, lng: 60 }, { lat: -50, lng: 65 }, { lat: -45, lng: 70 },
      { lat: 10, lng: -85 }, { lat: 15, lng: -80 }, { lat: 20, lng: -75 }, { lat: 25, lng: -70 }, { lat: 30, lng: -65 }, { lat: 35, lng: -60 }, { lat: 40, lng: -55 }, { lat: 45, lng: -50 }, { lat: 50, lng: -45 }, { lat: 55, lng: -40 }, { lat: 60, lng: -35 }, { lat: 65, lng: -30 }, { lat: 70, lng: -25 }, { lat: 75, lng: -20 }, { lat: 80, lng: -15 }, { lat: 85, lng: -10 },
    ]

    ctx.strokeStyle = '#d8d0c1'
    ctx.lineWidth = 1
    ctx.beginPath()
    let isFirst = true
    for (const pt of continentOutlines) {
      const [x, y] = latLngToXY(pt.lat, pt.lng, w, h)
      if (isFirst) {
        ctx.moveTo(x, y)
        isFirst = false
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    const maxCellCount = Math.max(...activityData.cells.map(c => c.count), 1)
    for (const cell of activityData.cells) {
      drawGridCell(ctx, cell.lat, cell.lng, cell.count, maxCellCount, w, h)
    }

    for (const arc of activityData.arcs) {
      drawArc(ctx, arc.sourceLat, arc.sourceLng, arc.targetLat, arc.targetLng, arc.color, w, h, 0.6)
    }

    const particles = particlesRef.current
    for (const p of particles) {
      if (p.arcIndex >= activityData.arcs.length) continue
      const arc = activityData.arcs[p.arcIndex]
      const [px, py] = getArcPoint(
        arc.sourceLat, arc.sourceLng,
        arc.targetLat, arc.targetLng,
        p.progress, w, h
      )

      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fillStyle = arc.color
      ctx.globalAlpha = 0.8
      ctx.fill()
      ctx.globalAlpha = 1

      p.progress += p.speed * 0.005
      if (p.progress > 1) {
        p.progress = 0
      }
    }

    const gradient = ctx.createLinearGradient(
      w - PADDING - 180, PADDING + 10,
      w - PADDING, PADDING + 10
    )
    gradient.addColorStop(0, 'rgba(0,0,255,0.8)')
    gradient.addColorStop(0.25, 'rgba(0,200,255,0.8)')
    gradient.addColorStop(0.5, 'rgba(0,255,100,0.8)')
    gradient.addColorStop(0.75, 'rgba(255,200,0,0.8)')
    gradient.addColorStop(1, 'rgba(255,0,0,0.8)')

    ctx.fillStyle = gradient
    ctx.fillRect(w - PADDING - 180, PADDING + 10, 180, 14)

    ctx.strokeStyle = '#d8d0c1'
    ctx.lineWidth = 1
    ctx.strokeRect(w - PADDING - 180, PADDING + 10, 180, 14)

    ctx.fillStyle = '#6f5f48'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Low', w - PADDING - 180, PADDING + 34)
    ctx.textAlign = 'right'
    ctx.fillText('High', w - PADDING, PADDING + 34)

    animFrameRef.current = requestAnimationFrame(draw)
  }, [activityData])

  useCanvasResize(canvasRef, draw)

  useEffect(() => {
    if (!activityData) return

    const neededParticles = Math.max(activityData.arcs.length * 3, 10)
    const currentParticles = particlesRef.current

    while (currentParticles.length < neededParticles) {
      const arcIndex = currentParticles.length % Math.max(activityData.arcs.length, 1)
      currentParticles.push({
        arcIndex,
        progress: Math.random(),
        speed: 0.5 + Math.random() * 0.5,
      })
    }

    while (currentParticles.length > neededParticles) {
      currentParticles.pop()
    }

    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [activityData, draw])

  useEffect(() => {
    if (!useMock) return

    const regions = [
      { lat: 40.7128, lng: -74.006 },
      { lat: 34.0522, lng: -118.2437 },
      { lat: 51.5074, lng: -0.1278 },
      { lat: 48.8566, lng: 2.3522 },
      { lat: 35.6762, lng: 139.6503 },
      { lat: 31.2304, lng: 121.4737 },
      { lat: -33.8688, lng: 151.2093 },
      { lat: -23.5505, lng: -46.6333 },
      { lat: 55.7558, lng: 37.6173 },
      { lat: 28.6139, lng: 77.209 },
      { lat: 1.3521, lng: 103.8198 },
      { lat: 19.076, lng: 72.8777 },
      { lat: 41.9028, lng: 12.4964 },
      { lat: 52.52, lng: 13.405 },
      { lat: 37.5665, lng: 126.978 },
    ]

    const interval = setInterval(() => {
      const msgCount = 3 + Math.floor(Math.random() * 8)
      for (let i = 0; i < msgCount; i++) {
        const srcIdx = Math.floor(Math.random() * regions.length)
        let dstIdx = Math.floor(Math.random() * regions.length)
        while (dstIdx === srcIdx) {
          dstIdx = Math.floor(Math.random() * regions.length)
        }
        const src = regions[srcIdx]
        const dst = regions[dstIdx]

        messagesRef.current.push({
          timestamp: Date.now(),
          sourceLat: src.lat + (Math.random() - 0.5) * 2,
          sourceLng: src.lng + (Math.random() - 0.5) * 2,
          targetLat: dst.lat + (Math.random() - 0.5) * 2,
          targetLng: dst.lng + (Math.random() - 0.5) * 2,
          messageCount: 1 + Math.floor(Math.random() * 20),
          nodeId: `node-${srcIdx}`,
        })

        if (messagesRef.current.length > 5000) {
          messagesRef.current = messagesRef.current.slice(-2500)
        }
      }
    }, 400)

    return () => clearInterval(interval)
  }, [useMock])

  useEffect(() => {
    if (aggregatedData) {
      setActivityData(aggregatedData)
      lastUpdateRef.current = Date.now()
    }
  }, [aggregatedData])

  return (
    <div className="rounded-lg border border-[#d8d0c1] bg-white">
      <div className="flex items-center justify-between border-b border-[#d8d0c1] px-5 py-3">
        <div>
          <h3 className="text-lg font-semibold text-[#1a1410]">
            Network Activity Heatmap
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#6f5f48]">
            <span className="flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  state === 'connected'
                    ? 'bg-green-500'
                    : state === 'connecting'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              {state === 'connected' ? 'Live' : state === 'connecting' ? 'Connecting' : 'Disconnected'}
            </span>
            {activityData && (
              <>
                <span>{activityData.messageCount.toLocaleString()} msgs</span>
                <span>{activityData.activeNodes} nodes</span>
                <span>{activityData.cells.length} cells</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                timeRange === range
                  ? 'bg-[#0f766e] text-white'
                  : 'bg-[#f7f4ee] text-[#6f5f48] hover:bg-[#ece5d8]'
              }`}
            >
              {TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          className="h-full w-full"
        />

        {!activityData && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#6f5f48]">
            {state === 'connecting' ? 'Connecting to data stream...' : 'Waiting for data...'}
          </div>
        )}
      </div>

      {state === 'error' && (
        <div className="border-t border-[#d8d0c1] px-5 py-2 text-xs text-red-600">
          WebSocket connection error. Attempting to reconnect...
        </div>
      )}
    </div>
  )
}
