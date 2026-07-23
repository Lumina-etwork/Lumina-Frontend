"use client";

import { useMemo, useState } from "react"
import { computeAprEstimate, formatAprBps } from "@/src/lib/staking/stakingCalculator"

interface AprCalculatorProps {
  aprBps: number
}

const MIN_AMOUNT = 100
const MAX_AMOUNT = 100_000
const MIN_DURATION = 1
const MAX_DURATION = 12

export function AprCalculator({ aprBps }: AprCalculatorProps) {
  const [amount, setAmount] = useState(10_000)
  const [duration, setDuration] = useState(6)

  const estimate = useMemo(
    () => computeAprEstimate(BigInt(amount) * 10_000_000n, duration, aprBps),
    [amount, duration, aprBps],
  )

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        Reward Calculator
      </h3>

      <div className="mb-5">
        <label
          htmlFor="calc-amount"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Amount: {amount.toLocaleString()} LUM
        </label>
        <input
          id="calc-amount"
          type="range"
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          step={100}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{MIN_AMOUNT} LUM</span>
          <span>{MAX_AMOUNT.toLocaleString()} LUM</span>
        </div>
      </div>

      <div className="mb-5">
        <label
          htmlFor="calc-duration"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Duration: {duration} month{duration !== 1 ? "s" : ""}
        </label>
        <input
          id="calc-duration"
          type="range"
          min={MIN_DURATION}
          max={MAX_DURATION}
          step={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{MIN_DURATION} month</span>
          <span>{MAX_DURATION} months</span>
        </div>
      </div>

      <div className="space-y-3 rounded-lg bg-surface-alt p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">APR</span>
          <span className="text-sm font-semibold text-foreground">
            {formatAprBps(aprBps)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Estimated Rewards</span>
          <span className="text-sm font-semibold text-foreground">
            {(Number(estimate.estimatedRewards) / 1e7).toLocaleString()} LUM
          </span>
        </div>
        <div className="border-t border-table-divider pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Total at Maturity</span>
            <span className="text-base font-bold text-foreground">
              {(Number(estimate.totalAtMaturity) / 1e7).toLocaleString()} LUM
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
