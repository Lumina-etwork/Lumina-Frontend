export type RegionRole = 'primary' | 'secondary' | 'observer';

export interface RegionHealth {
  region: string;
  role: RegionRole;
  latencyMsP99: number;
  replicationLagMs: number;
  errorRate: number;
  lastHeartbeatAt: number;
}

export interface DisasterRecoveryPolicy {
  criticalPathP99Ms: number;
  maxReplicationLagMs: number;
  maxErrorRate: number;
  heartbeatTimeoutMs: number;
  availabilityTarget: number;
  minHealthySecondaries: number;
}

export interface RegionAssessment extends RegionHealth {
  healthy: boolean;
  reasons: string[];
}

export interface DisasterRecoveryAssessment {
  generatedAt: number;
  meetsAvailabilityTarget: boolean;
  primary?: RegionAssessment;
  secondaries: RegionAssessment[];
  observers: RegionAssessment[];
  recommendedFailoverRegion?: string;
  rpoMs: number;
  rtoMs: number;
  alerts: string[];
}
