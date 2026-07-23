import type { AprEstimate, StakingChartPoint, UnstakeRequest } from "./types"

const BASIS_POINTS_DIVISOR = 10_000n
const COOLDOWN_DAYS = 21n
const DAY_MS = 86_400_000
const COOLDOWN_MS = BigInt(COOLDOWN_DAYS) * BigInt(DAY_MS)

export function formatAprBps(aprBps: number): string {
  const whole = Math.floor(aprBps / 100)
  const frac = aprBps % 100
  return `${whole}.${frac.toString().padStart(2, "0")}%`
}

export function estimateRewards(
  amount: bigint,
  aprBps: number,
  durationMonths: number,
): bigint {
  const principal = amount
  const rate = BigInt(aprBps)
  const months = BigInt(durationMonths)
  const numerator = principal * rate * months
  const denominator = BASIS_POINTS_DIVISOR * 12n
  return numerator / denominator
}

export function computeAprEstimate(
  amount: bigint,
  durationMonths: number,
  aprBps: number,
): AprEstimate {
  const estimatedRewards = estimateRewards(amount, aprBps, durationMonths)
  return {
    amount,
    durationMonths,
    aprBps,
    estimatedRewards,
    totalAtMaturity: amount + estimatedRewards,
  }
}

export function getCooldownEnd(requestedAt: number): number {
  return requestedAt + Number(COOLDOWN_MS)
}

export function getCooldownRemaining(request: UnstakeRequest): number {
  const now = Date.now()
  if (request.status === "claimed") return 0
  if (now >= request.cooldownEndsAt) return 0
  return request.cooldownEndsAt - now
}

export function isCooldownComplete(request: UnstakeRequest): boolean {
  return getCooldownRemaining(request) <= 0
}

export function formatCooldownTime(ms: number): string {
  if (ms <= 0) return "Ready to claim"
  const S_PER_DAY = 86_400
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / S_PER_DAY)
  const hours = Math.floor((totalSeconds % S_PER_DAY) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)
  return parts.join(" ")
}

export function generateMockChartData(points: number = 30): StakingChartPoint[] {
  const now = Date.now()
  const data: StakingChartPoint[] = []
  let balance = 1_000_000_000_000n
  for (let i = points; i >= 0; i--) {
    const ts = now - i * DAY_MS
    const growth = BigInt(Math.floor(Math.random() * 50_000_000))
    balance = balance + growth
    data.push({
      timestamp: ts,
      balance,
      label: new Date(ts).toLocaleDateString(),
    })
  }
  return data
}
