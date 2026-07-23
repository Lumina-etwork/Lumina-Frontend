"use client";

import { useState } from "react"
import { formatAprBps } from "@/src/lib/staking/stakingCalculator"

interface StakeFormProps {
  aprBps: number
  onStake: (amount: bigint) => Promise<boolean>
  isSubmitting: boolean
}

export function StakeForm({ aprBps, onStake, isSubmitting }: StakeFormProps) {
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)

  const parsed = amount.trim() === "" ? 0n : BigInt(Math.round(parseFloat(amount) * 1e7))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      setError("Enter a valid amount")
      return
    }
    const success = await onStake(parsed)
    if (success) setAmount("")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-surface p-6"
    >
      <h3 className="mb-4 text-base font-semibold text-foreground">Stake LUM</h3>

      <div className="mb-4">
        <label
          htmlFor="stake-amount"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Amount
        </label>
        <input
          id="stake-amount"
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
        <span className="text-xs text-muted">Current APR</span>
        <span className="text-sm font-semibold text-foreground">
          {formatAprBps(aprBps)}
        </span>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || parsed <= 0n}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-text transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Staking..." : "Stake"}
      </button>
    </form>
  )
}
