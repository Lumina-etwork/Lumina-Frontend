export interface Asset {
  onchain_id: number;
  creator: string;
  fingerprint: string;
  metadata_uri: string | null;
  licensing_fee: string | null;
  timestamp: number;
}

export interface Escrow {
  onchain_id: number;
  client: string;
  creator: string;
  total_amount: string;
  remaining_balance: string;
  completed_milestones: number;
  total_milestones: number;
  status: string;
}

/** Only merit-derived fields ever cross the wire for a candidate. */
export interface BlindCandidate {
  node_id: string;
  merit_score: number;
  verified_skills: string[];
  completed_escrows: number;
  milestone_completion_rate: number;
  anchored_assets: number;
}

export interface RankedCandidate extends BlindCandidate {
  matched_skills: string[];
  match_score: number;
}

export interface Health {
  status: string;
  contract_id: string;
  uptime_ms: number;
  timestamp: number;
}

export interface MatchRequest {
  required_skills: string[];
  min_merit_score?: number;
  min_completion_rate?: number;
}

export interface IpAnchorData {
  asset_id: number;
  creator: string;
  fingerprint: string;
  timestamp: number;
}

export interface EscrowCreatedData {
  escrow_id: number;
  client: string;
  creator: string;
  total_amount: string;
  total_milestones: number;
}

export interface MilestoneReleasedData {
  escrow_id: number;
  payout_amount: string;
  completed_milestones: number;
  status: string;
}

export type StreamFrame =
  | { type: 'IP_ANCHOR'; data: IpAnchorData }
  | { type: 'ESCROW_CREATED'; data: EscrowCreatedData }
  | { type: 'MILESTONE_RELEASED'; data: MilestoneReleasedData }
  | { type: string; data: unknown };

export type StreamStatus = 'connecting' | 'live' | 'offline';
