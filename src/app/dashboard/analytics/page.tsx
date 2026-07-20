'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnalyticsTimeSeries } from '@/src/components/charts/AnalyticsTimeSeries'
import { SkeletonChart } from '@/src/components/skeleton/SkeletonChart'
import { useNetworkAnalytics } from '@/src/hooks/useNetworkAnalytics'
import type { AnalyticsDataPoint, AggregatedResult, RollupGranularity } from '@/src/types/network'

function generateMockData(): AnalyticsDataPoint[] {
  const now = Date.now()
  const points: AnalyticsDataPoint[] = []
  for (let i = 0; i < 500_000; i++) {
    const timestamp = now - i * 60_000
    points.push({
      timestamp,
      latency: Math.random() * 200 + 10,
      throughput: Math.random() * 1000 + 100,
      packetLoss: Math.random() * 0.05,
    })
  }
  return points
}

export default function AnalyticsPage() {
  const { aggregate, workerAvailable } = useNetworkAnalytics()
  const [result, setResult] = useState<AggregatedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [granularity, setGranularity] = useState<RollupGranularity>('hourly')

  const runAggregation = useCallback(async () => {
    setLoading(true)
    try {
      const now = Date.now()
      const data = generateMockData()
      const config = {
        granularity,
        startTime: now - 365 * 86_400_000,
        endTime: now,
      }
      const res = await aggregate(data, config)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }, [aggregate, granularity])

  useEffect(() => {
    runAggregation()
  }, [runAggregation])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted">
              Network Analytics
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
              Year-long connection performance
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {workerAvailable === true && (
              <span className="rounded-md bg-tag-bg px-2.5 py-1 text-xs font-semibold text-primary">
                Worker active
              </span>
            )}
            {workerAvailable === false && (
              <span className="rounded-md bg-warning/10 px-2.5 py-1 text-xs font-semibold text-danger">
                Main thread fallback
              </span>
            )}
          </div>
        </header>

        <div className="flex flex-wrap gap-3 py-5">
          {(['hourly', 'daily', 'weekly'] as const).map((g) => (
            <button
              key={g}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                granularity === g
                  ? 'border-primary bg-primary text-primary-text'
                  : 'border-border-light bg-surface text-muted-text hover:border-primary hover:text-primary'
              }`}
              onClick={() => setGranularity(g)}
              type="button"
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
          <button
            className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-text transition hover:bg-primary-hover disabled:opacity-50"
            disabled={loading}
            onClick={runAggregation}
            type="button"
          >
            {loading ? 'Computing…' : 'Recompute'}
          </button>
        </div>

        {loading ? (
          <SkeletonChart bars={20} height={300} />
        ) : (
          <AnalyticsTimeSeries data={result} loading={false} />
        )}
      </div>
    </main>
  )
}
