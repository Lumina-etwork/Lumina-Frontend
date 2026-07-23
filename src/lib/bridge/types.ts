export type ChainId = "ethereum" | "polygon" | "arbitrum" | "stellar"

export type BridgeStatus =
  | "Initiated"
  | "SourceConfirmed"
  | "BridgeRelayed"
  | "DestinationPending"
  | "DestinationConfirmed"
  | "Complete"
  | "Failed"

export interface ChainConfig {
  id: ChainId
  name: string
  shortName: string
  requiredConfirmations: number
  averageBlockTimeMs: number
  explorerUrl: string
}

export const CHAINS: Record<ChainId, ChainConfig> = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    shortName: "ETH",
    requiredConfirmations: 12,
    averageBlockTimeMs: 12_000,
    explorerUrl: "https://etherscan.io",
  },
  polygon: {
    id: "polygon",
    name: "Polygon",
    shortName: "MATIC",
    requiredConfirmations: 64,
    averageBlockTimeMs: 2_000,
    explorerUrl: "https://polygonscan.com",
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum",
    shortName: "ARB",
    requiredConfirmations: 64,
    averageBlockTimeMs: 250,
    explorerUrl: "https://arbiscan.io",
  },
  stellar: {
    id: "stellar",
    name: "Stellar Soroban",
    shortName: "XLM",
    requiredConfirmations: 1,
    averageBlockTimeMs: 5_000,
    explorerUrl: "https://stellar.expert/explorer/public",
  },
}

export interface BridgeRoute {
  id: string
  sourceChain: ChainId
  destinationChain: ChainId
  estimatedTimeMs: number
  historicalMedianTimeMs: number
  feeBps: number
  minAmount: string
  maxAmount: string
}

export interface BridgeTransaction {
  id: string
  sourceChain: ChainId
  destinationChain: ChainId
  token: string
  amount: string
  sourceTxHash: string
  destinationTxHash?: string
  status: BridgeStatus
  currentConfirmations: number
  requiredConfirmations: number
  initiatedAt: number
  sourceConfirmedAt?: number
  bridgeRelayedAt?: number
  destinationPendingAt?: number
  destinationConfirmedAt?: number
  completedAt?: number
  failedAt?: number
  errorReason?: string
  recommendedAction?: "retry" | "contact_support"
  gasUsed?: string
  estimatedGas?: string
  actualTimeMs?: number
  estimatedTimeMs: number
}
