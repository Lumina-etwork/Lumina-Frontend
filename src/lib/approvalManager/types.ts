export type ApprovalStatus = "active" | "revoked" | "expired"

export type SpendingCapPeriod = "daily" | "weekly"

export interface Approval {
  id: string
  token: string
  tokenSymbol?: string
  tokenDecimals?: number
  dAppAddress: string
  dAppEnsName?: string
  dAppReputation?: "trusted" | "known" | "unknown" | "suspicious"
  allowance: bigint
  currentSpent: bigint
  lastUsedAt?: number
  createdAt: number
  status: ApprovalStatus
  isUnlimited: boolean
}

export interface SpendingCap {
  id: string
  dAppAddress: string
  dAppEnsName?: string
  period: SpendingCapPeriod
  limit: bigint
  spent: bigint
  windowStart: number
  lastUpdated: number
}

export interface ApprovalHistoryEntry {
  id: string
  approvalId: string
  token: string
  tokenSymbol?: string
  dAppAddress: string
  dAppEnsName?: string
  previousAllowance: bigint
  newAllowance: bigint
  changeType: "approve" | "revoke" | "modify" | "cap_change" | "spend"
  txHash?: string
  timestamp: number
}

export interface ApprovalStoreEvents {
  approval_added: { approval: Approval }
  approval_updated: { approval: Approval }
  approval_removed: { id: string }
  cap_added: { cap: SpendingCap }
  cap_updated: { cap: SpendingCap }
  cap_removed: { id: string }
  history_added: { entry: ApprovalHistoryEntry }
}

export type ApprovalStoreListener = (event: ApprovalStoreEvents[keyof ApprovalStoreEvents]) => void
