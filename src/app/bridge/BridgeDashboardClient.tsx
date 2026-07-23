"use client"

import dynamic from "next/dynamic"

const BridgeDashboard = dynamic(
  () =>
    import("@/src/components/bridge/BridgeDashboard").then(
      (mod) => mod.BridgeDashboard,
    ),
  { ssr: false },
)

export function BridgeDashboardClient() {
  return <BridgeDashboard />
}
