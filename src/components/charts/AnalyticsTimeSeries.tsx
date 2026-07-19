'use client'

import { useMemo } from 'react'
import type { AggregatedResult } from '@/src/types/network'

interface AnalyticsTimeSeriesProps {
  data: AggregatedResult | null
  loading: boolean
}

export function AnalyticsTimeSeries({ data, loading }: AnalyticsTimeSeriesProps) {
  const series = useMemo(() => {
    if (!data) return []
    return data.buckets.map((b) => ({
      time: new Date(b.bucketStart).toLocaleString(),
      avgLatency: b.avgLatency.toFixed(2),
      p95: b.p95Latency.toFixed(2),
      throughput: b.avgThroughput.toFixed(2),
      packetLoss: (b.avgPacketLoss * 100).toFixed(2),
    }))
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-surface p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-sm text-muted">Computing analytics…</span>
      </div>
    )
  }

  if (!data || data.buckets.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
        No analytics data available for the selected period.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <div className="border-b border-table-divider px-5 py-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Overall
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {data.overall.avgLatency.toFixed(1)} ms
            </p>
            <p className="text-xs text-muted">
              p95: {data.overall.p95Latency.toFixed(1)} ms &middot; p99:{' '}
              {data.overall.p99Latency.toFixed(1)} ms &middot;{' '}
              {data.overall.totalDataPoints.toLocaleString()} data points
            </p>
          </div>
        </div>
      </div>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-surface-alt text-xs uppercase tracking-[0.12em] text-muted">
          <tr>
            <th className="px-5 py-3 font-semibold">Time</th>
            <th className="px-5 py-3 font-semibold">Avg Latency</th>
            <th className="px-5 py-3 font-semibold">p95</th>
            <th className="px-5 py-3 font-semibold">Throughput</th>
            <th className="px-5 py-3 font-semibold">Packet Loss</th>
          </tr>
        </thead>
        <tbody>
          {series.map((row) => (
            <tr className="border-t border-table-divider" key={row.time}>
              <td className="px-5 py-3 font-medium">{row.time}</td>
              <td className="px-5 py-3">{row.avgLatency} ms</td>
              <td className="px-5 py-3">{row.p95} ms</td>
              <td className="px-5 py-3">{row.throughput} /s</td>
              <td className="px-5 py-3">{row.packetLoss}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
