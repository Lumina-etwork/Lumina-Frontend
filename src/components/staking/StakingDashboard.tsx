"use client";

import { StakingOverview } from "./StakingOverview"
import { StakeForm } from "./StakeForm"
import { UnstakeForm } from "./UnstakeForm"
import { RewardHistory } from "./RewardHistory"
import { AprCalculator } from "./AprCalculator"
import { StakingChart } from "./StakingChart"
import { useStaking } from "@/src/hooks/useStaking"

const DEMO_WALLET = "GABCDEF1234567890"

export function StakingDashboard() {
  const {
    portfolio,
    portfolioLoading,
    chartData,
    chartLoading,
    isSubmitting,
    cooldownInfo,
    stake,
    requestUnstake,
    claimRewards,
    fetchHistoryPage,
  } = useStaking(DEMO_WALLET)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staking</h1>
        <p className="mt-1 text-sm text-muted">
          Stake LUM tokens and earn rewards.
        </p>
      </div>

      <StakingOverview
        portfolio={portfolio}
        loading={portfolioLoading}
        onClaimRewards={claimRewards}
        isSubmitting={isSubmitting}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <StakeForm
          aprBps={portfolio?.aprBps ?? 1200}
          onStake={stake}
          isSubmitting={isSubmitting}
        />
        <UnstakeForm
          onRequestUnstake={requestUnstake}
          isSubmitting={isSubmitting}
          cooldownInfo={cooldownInfo}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AprCalculator aprBps={portfolio?.aprBps ?? 1200} />
        <StakingChart data={chartData} loading={chartLoading} />
      </div>

      <RewardHistory fetchPage={fetchHistoryPage} loading={false} />
    </div>
  )
}
