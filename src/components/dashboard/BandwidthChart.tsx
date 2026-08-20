
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useBandwidthStream, type BandwidthDataPoint } from '../../hooks/useBandwidthStream'
import { BandwidthFrameQueue } from '../../utils/telemetry/bandwidthFrameQueue'
import { drawBandwidthChart } from './chart/d3Renderer'

export interface BandwidthChartProps {
  wsUrl: string
  title?: string
  height?: number
  enablePerformanceTracking?: boolean
}

export function BandwidthChart({
  wsUrl,
  title = 'Bandwidth Usage',
  height = 300,
  enablePerformanceTracking = false,
}: BandwidthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const mainThreadDataRef = useRef<BandwidthDataPoint[]>([])
  const mainThreadQueueRef = useRef(new BandwidthFrameQueue())

  const [dimensions, setDimensions] = useState({ width: 400, height })
  const [useWorker, setUseWorker] = useState(false)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [mainThreadDecimated, setMainThreadDecimated] = useState(false)
  const [stats, setStats] = useState({ current: 0, average: 0, peak: 0, pointsCount: 0 })

  const updateStats = useCallback((newData: BandwidthDataPoint[]) => {
    if (newData.length === 0) return
    const values = newData.map((d) => d.value)
    setStats({
      current: values[values.length - 1],
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      peak: Math.max(...values),
      pointsCount: newData.length,
    })
  }, [])

  const appendVisibleFrames = useCallback((frames: BandwidthDataPoint[]) => {
    const data = mainThreadDataRef.current
    frames.forEach((frame) => {
      if (!data.some((point) => point.timestamp === frame.timestamp)) data.push(frame)
    })
    data.sort((a, b) => a.timestamp - b.timestamp)
    while (data.length > 300) data.shift()
    updateStats(data)
  }, [updateStats])

  const handleDataPoint = useCallback((point: BandwidthDataPoint) => {
    if (workerRef.current && useWorker) {
      workerRef.current.postMessage({ type: 'data', data: point })
      appendVisibleFrames([point])
      return
    }

    mainThreadQueueRef.current.enqueue(point)
  }, [appendVisibleFrames, useWorker])

  const ws = useBandwidthStream({ wsUrl, onMessage: handleDataPoint })

  useEffect(() => {
    setConnectionState(
      ws.state === 'connected' ? 'connected' : ws.state === 'connecting' ? 'connecting' : 'disconnected'
    )
  }, [ws.state])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const rect = container.getBoundingClientRect()
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const width = rect.width || 400
    setDimensions({ width, height })

    const supportsOffscreen = typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function'
    if (supportsOffscreen && !workerRef.current) {
      try {
        const worker = new Worker(new URL('../../workers/bandwidthWorker.ts', import.meta.url), { type: 'module' })
        canvas.width = width * dpr
        canvas.height = height * dpr
        const offscreen = canvas.transferControlToOffscreen()
        worker.postMessage({ type: 'init', canvas: offscreen, width: width * dpr, height: height * dpr }, [offscreen])
        workerRef.current = worker
        setUseWorker(true)
      } catch (error) {
        console.warn('Failed to initialize OffscreenCanvas worker, falling back to main thread:', error)
        setUseWorker(false)
      }
    }

    const handleResize = () => {
      if (!containerRef.current) return
      const nextWidth = containerRef.current.getBoundingClientRect().width || 400
      setDimensions({ width: nextWidth, height })

      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'resize', width: nextWidth * dpr, height: height * dpr })
      } else if (canvasRef.current) {
        canvasRef.current.width = nextWidth * dpr
        canvasRef.current.height = height * dpr
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      workerRef.current?.terminate()
      workerRef.current = null
      mainThreadQueueRef.current.clear()
    }
  }, [height])

  useEffect(() => {
    if (useWorker) return

    let frameId = 0
    const renderFrame = () => {
      const drained = mainThreadQueueRef.current.drain()
      if (drained.frames.length > 0) {
        appendVisibleFrames(drained.frames)
        setMainThreadDecimated(drained.catchUp)

        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (ctx) {
          drawBandwidthChart(
            ctx,
            mainThreadDataRef.current,
            dimensions.width,
            dimensions.height,
            drained.catchUp
          )
        }
      } else if (mainThreadQueueRef.current.size === 0 && mainThreadDecimated) {
        setMainThreadDecimated(false)
      }

      frameId = requestAnimationFrame(renderFrame)
    }

    frameId = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(frameId)
  }, [appendVisibleFrames, dimensions, mainThreadDecimated, useWorker])

  return (
    <div ref={containerRef} className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <div className="mt-1 flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-green-500'
                    : connectionState === 'connecting'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              {connectionState === 'connected' ? 'Live' : connectionState === 'connecting' ? 'Connecting' : 'Disconnected'}
            </span>
            <span>{stats.pointsCount} / 300 points</span>
            {mainThreadDecimated && !useWorker && (
              <span className="text-[10px] bg-surface-alt text-muted px-1.5 py-0.5 rounded font-mono">
                Catching up
              </span>
            )}
            {enablePerformanceTracking && (
              <span className="text-[10px] bg-surface-alt text-muted px-1.5 py-0.5 rounded font-mono">
                {useWorker ? 'Worker Offscreen' : 'Main Thread Fallback'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: dimensions.height }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {stats.pointsCount > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-table-divider pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Current</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{stats.current.toFixed(2)}</p>
            <p className="text-xs text-muted">Mb/s</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Average</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{stats.average.toFixed(2)}</p>
            <p className="text-xs text-muted">Mb/s</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Peak</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{stats.peak.toFixed(2)}</p>
            <p className="text-xs text-muted">Mb/s</p>
          </div>
        </div>
      )}
    </div>
  )
}
