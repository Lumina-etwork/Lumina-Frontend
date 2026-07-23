"use client"

import dynamic from "next/dynamic"

const StakingDashboard = dynamic(
  () =>
    import("@/src/components/staking/StakingDashboard").then(
      (mod) => mod.StakingDashboard,
    ),
  { ssr: false },
)

export function StakingDashboardClient() {
  return <StakingDashboard />
}
