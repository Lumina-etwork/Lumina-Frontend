export interface StakingPortfolio {
  totalStaked: bigint
  aprBps: number
  userStake: bigint
  pendingRewards: bigint
  nextRewardClaimDate: number | null
}

export interface StakeInput {
  amount: bigint
  walletAddress: string
}

export interface UnstakeRequest {
  amount: bigint
  walletAddress: string
  requestedAt: number
  cooldownEndsAt: number
  status: "pending" | "ready" | "claimed"
}

export interface RewardRecord {
  id: string
  amount: bigint
  timestamp: number
  type: "stake" | "unstake" | "reward"
  txHash: string
}

export interface RewardHistoryPage {
  records: RewardRecord[]
  totalRecords: number
  page: number
  pageSize: number
}

export interface StakingChartPoint {
  timestamp: number
  balance: bigint
  label: string
}

export interface AprEstimate {
  amount: bigint
  durationMonths: number
  aprBps: number
  estimatedRewards: bigint
  totalAtMaturity: bigint
}
