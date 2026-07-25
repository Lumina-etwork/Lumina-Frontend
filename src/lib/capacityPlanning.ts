export interface CapacityUsageSample {
  timestamp: string
  requests: number
  capacity: number
  errors?: number
  latencyMs?: number
}

export interface CapacityForecastPoint extends CapacityUsageSample {
  projectedRequests: number
  utilizationPercent: number
  projectedUtilizationPercent: number
}

export interface CapacityPlanningResult {
  currentUtilizationPercent: number
  peakUtilizationPercent: number
  averageGrowthPercent: number
  daysUntilSaturation: number | null
  recommendedCapacity: number
  recommendation: 'stable' | 'watch' | 'scale'
  forecast: CapacityForecastPoint[]
}

const MIN_CAPACITY_HEADROOM = 0.2
const SCALE_THRESHOLD_PERCENT = 85
const WATCH_THRESHOLD_PERCENT = 70
const DEFAULT_FORECAST_DAYS = 14

function round(value: number, digits = 2): number {
  const multiplier = 10 ** digits
  return Math.round(value * multiplier) / multiplier
}

function utilizationPercent(requests: number, capacity: number): number {
  if (capacity <= 0) return 0
  return round((requests / capacity) * 100)
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function calculateCapacityPlan(
  samples: CapacityUsageSample[],
  forecastDays = DEFAULT_FORECAST_DAYS,
): CapacityPlanningResult {
  const orderedSamples = [...samples]
    .filter((sample) => Number.isFinite(sample.requests) && Number.isFinite(sample.capacity))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  if (orderedSamples.length === 0) {
    return {
      currentUtilizationPercent: 0,
      peakUtilizationPercent: 0,
      averageGrowthPercent: 0,
      daysUntilSaturation: null,
      recommendedCapacity: 0,
      recommendation: 'stable',
      forecast: [],
    }
  }

  const growthRates = orderedSamples.slice(1).map((sample, index) => {
    const previous = orderedSamples[index]
    if (!previous || previous.requests <= 0) return 0
    return (sample.requests - previous.requests) / previous.requests
  })
  const averageGrowthRate = Math.max(0, average(growthRates))
  const latest = orderedSamples[orderedSamples.length - 1]
  const forecast: CapacityForecastPoint[] = orderedSamples.map((sample) => {
    const projectedRequests = sample.requests
    return {
      ...sample,
      projectedRequests,
      utilizationPercent: utilizationPercent(sample.requests, sample.capacity),
      projectedUtilizationPercent: utilizationPercent(projectedRequests, sample.capacity),
    }
  })

  for (let day = 1; day <= forecastDays; day += 1) {
    const projectedRequests = round(latest.requests * (1 + averageGrowthRate) ** day, 0)
    const projectedDate = new Date(latest.timestamp)
    projectedDate.setUTCDate(projectedDate.getUTCDate() + day)
    forecast.push({
      timestamp: projectedDate.toISOString().slice(0, 10),
      requests: latest.requests,
      capacity: latest.capacity,
      errors: latest.errors,
      latencyMs: latest.latencyMs,
      projectedRequests,
      utilizationPercent: utilizationPercent(latest.requests, latest.capacity),
      projectedUtilizationPercent: utilizationPercent(projectedRequests, latest.capacity),
    })
  }

  const firstSaturated = forecast.findIndex((point) => point.projectedUtilizationPercent >= 100)
  const latestIndex = orderedSamples.length - 1
  const daysUntilSaturation = firstSaturated > latestIndex ? firstSaturated - latestIndex : null
  const currentUtilizationPercent = utilizationPercent(latest.requests, latest.capacity)
  const peakUtilizationPercent = Math.max(...orderedSamples.map((sample) => utilizationPercent(sample.requests, sample.capacity)))
  const projectedPeak = Math.max(...forecast.map((point) => point.projectedRequests))
  const recommendedCapacity = Math.ceil(projectedPeak * (1 + MIN_CAPACITY_HEADROOM))
  const forecastPeakUtilization = Math.max(...forecast.map((point) => point.projectedUtilizationPercent))

  const recommendation =
    forecastPeakUtilization >= SCALE_THRESHOLD_PERCENT || currentUtilizationPercent >= SCALE_THRESHOLD_PERCENT
      ? 'scale'
      : forecastPeakUtilization >= WATCH_THRESHOLD_PERCENT || currentUtilizationPercent >= WATCH_THRESHOLD_PERCENT
        ? 'watch'
        : 'stable'

  return {
    currentUtilizationPercent,
    peakUtilizationPercent,
    averageGrowthPercent: round(averageGrowthRate * 100),
    daysUntilSaturation,
    recommendedCapacity,
    recommendation,
    forecast,
  }
}
