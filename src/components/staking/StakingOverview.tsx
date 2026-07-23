"use client";

import type { StakingPortfolio } from "@/src/lib/staking/types"
import { formatAprBps } from "@/src/lib/staking/stakingCalculator"

interface StakingOverviewProps {
  portfolio: StakingPortfolio | undefined
  loading: boolean
  onClaimRewards: () => void
  isSubmitting: boolean
}

function LoadingSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-6 h-5 w-40 animate-pulse rounded bg-surface-alt" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-surface-alt" />
            <div className="h-6 w-28 animate-pulse rounded bg-surface-alt" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StakingOverview({
  portfolio,
  loading,
  onClaimRewards,
  isSubmitting,
}: StakingOverviewProps) {
  if (loading) return <LoadingSkeleton />

  if (!portfolio) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted">
        Connect your wallet to view staking overview.
      </div>
    )
  }

  const stats = [
    {
      label: "Total Staked",
      value: `${(Number(portfolio.totalStaked) / 1e7).toLocaleString()} LUM`,
    },
    {
      label: "Current APR",
      value: formatAprBps(portfolio.aprBps),
    },
    {
      label: "Your Stake",
      value: `${(Number(portfolio.userStake) / 1e7).toLocaleString()} LUM`,
    },
    {
      label: "Pending Rewards",
      value: `${(Number(portfolio.pendingRewards) / 1e7).toLocaleString()} LUM`,
    },
    {
      label: "Next Reward Claim",
      value: portfolio.nextRewardClaimDate
        ? new Date(portfolio.nextRewardClaimDate).toLocaleDateString()
        : "N/A",
    },
  ]

  const canClaim = portfolio.pendingRewards > 0n

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Staking Overview</h2>
        <button
          onClick={onClaimRewards}
          disabled={!canClaim || isSubmitting}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-text transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Claiming..." : "Claim Rewards"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
