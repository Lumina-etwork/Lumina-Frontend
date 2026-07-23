"use client";

import { useEffect, useState } from "react"
import { formatCooldownTime } from "@/src/lib/staking/stakingCalculator"
import type { UnstakeRequest } from "@/src/lib/staking/types"

interface UnstakeFormProps {
  onRequestUnstake: (amount: bigint) => Promise<boolean>
  isSubmitting: boolean
  cooldownInfo: {
    remaining: number
    formatted: string
    isComplete: boolean
    request: UnstakeRequest
  } | null
}

export function UnstakeForm({
  onRequestUnstake,
  isSubmitting,
  cooldownInfo,
}: UnstakeFormProps) {
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!cooldownInfo || cooldownInfo.isComplete) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [cooldownInfo])

  const parsed = amount.trim() === "" ? 0n : BigInt(Math.round(parseFloat(amount) * 1e7))

  const liveRemaining = cooldownInfo && !cooldownInfo.isComplete
    ? Math.max(0, cooldownInfo.request.cooldownEndsAt - now)
    : 0

  const liveFormatted = liveRemaining > 0
    ? formatCooldownTime(liveRemaining)
    : "Ready to claim"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      setError("Enter a valid amount")
      return
    }
    const success = await onRequestUnstake(parsed)
    if (success) setAmount("")
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="mb-4 text-base font-semibold text-foreground">Unstake LUM</h3>

      {cooldownInfo && !cooldownInfo.isComplete && (
        <div className="mb-4 rounded-lg border border-warning bg-warning-fill/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-warning">
            Cooldown Active
          </p>
          <p className="mt-1 text-lg font-mono font-semibold text-foreground">
            {liveFormatted}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            21-day cooldown period before funds are available.
          </p>
        </div>
      )}

      {cooldownInfo && cooldownInfo.isComplete && (
        <div className="mb-4 rounded-lg border border-status-healthy bg-status-healthy/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-status-healthy">
            Ready to Claim
          </p>
          <p className="mt-1 text-sm text-foreground">
            Your unstaked tokens are ready. Your request is in claimable status.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="unstake-amount"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Amount
          </label>
          <input
            id="unstake-amount"
            type="number"
            step="any"
            min="0"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-alt px-4 py-2">
          <span className="text-xs text-muted">Cooldown Period</span>
          <span className="text-sm font-semibold text-foreground">21 days</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || parsed <= 0n || (cooldownInfo !== null && !cooldownInfo.isComplete)}
          className="w-full rounded-lg border border-danger bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Processing..." : "Request Unstake"}
        </button>
      </form>
    </div>
  )
}
