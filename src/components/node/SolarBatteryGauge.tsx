'use client'

import { useMemo } from 'react'
import { useSolarForecast } from '@/src/hooks/useSolarForecast'

export interface SolarBatteryGaugeProps {
  facilityId: string
  nodeLabel: string
}

function getThemeColor(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}

function gaugeColor(level: number): string {
  if (level > 60) return getThemeColor('--color-status-healthy')
  if (level >= 20) return getThemeColor('--color-status-warning')
  return getThemeColor('--color-status-critical')
}

function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) return 'Not updated yet'
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return 'Last updated: just now'
  return `Last updated: ${minutes} min ago`
}

export function SolarBatteryGauge({ facilityId, nodeLabel }: SolarBatteryGaugeProps) {
  const forecast = useSolarForecast(facilityId)
  const currentLevel = forecast.batteryEstimate[0] ?? 0
  const circumference = 2 * Math.PI * 42
  const strokeOffset = circumference - (currentLevel / 100) * circumference
  const color = gaugeColor(currentLevel)

  const sparklinePoints = useMemo(() => {
    if (forecast.batteryEstimate.length === 0) return ''
    return forecast.batteryEstimate
      .map((level, index) => {
        const x = (index / 47) * 220
        const y = 44 - (level / 100) * 40
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [forecast.batteryEstimate])

  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Solar Forecast
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{nodeLabel}</h3>
        </div>
        <button
          type="button"
          className="rounded-md border border-border-light px-2 py-1 text-xs font-medium text-foreground transition hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void forecast.refresh()}
          disabled={forecast.isLoading}
          aria-label={`Refresh solar forecast for ${nodeLabel}`}
        >
          {forecast.isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`Estimated battery ${currentLevel}%`}>
          <circle cx="56" cy="56" r="42" fill="none" stroke="var(--color-table-divider)" strokeWidth="12" />
          <circle
            cx="56"
            cy="56"
            r="42"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            transform="rotate(-90 56 56)"
          />
          <text x="56" y="52" textAnchor="middle" className="fill-foreground text-xl font-semibold">
            {currentLevel}%
          </text>
          <text x="56" y="69" textAnchor="middle" className="fill-muted text-[10px] uppercase tracking-wide">
            battery
          </text>
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">48-hour forecast, 1-hour resolution</p>
          <p className="mt-2 text-xs text-foreground">{formatLastUpdated(forecast.lastUpdated)}</p>
          {(forecast.isUsingCachedForecast || forecast.isUsingFallback) && (
            <p className="mt-2 rounded bg-warning/15 px-2 py-1 text-xs text-warning-text">
              {forecast.isUsingFallback ? 'Using historical solar averages' : 'Using cached forecast'}
            </p>
          )}
          {forecast.error && <p className="mt-2 text-xs text-danger">{forecast.error}</p>}
        </div>
      </div>

      <svg className="mt-4 h-14 w-full" viewBox="0 0 220 48" preserveAspectRatio="none" aria-hidden="true">
        <polyline fill="none" stroke="var(--color-border)" strokeWidth="1" points="0,44 220,44" />
        {sparklinePoints && <polyline fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" points={sparklinePoints} />}
      </svg>
    </article>
  )
}
