import type {
  DisasterRecoveryAssessment,
  DisasterRecoveryPolicy,
  RegionAssessment,
  RegionHealth,
} from './types';

export const DEFAULT_DR_POLICY: DisasterRecoveryPolicy = {
  criticalPathP99Ms: 100,
  maxReplicationLagMs: 5_000,
  maxErrorRate: 0.01,
  heartbeatTimeoutMs: 30_000,
  availabilityTarget: 0.9999,
  minHealthySecondaries: 1,
};

export function assessRegion(
  region: RegionHealth,
  now: number,
  policy: DisasterRecoveryPolicy = DEFAULT_DR_POLICY,
): RegionAssessment {
  const reasons: string[] = [];

  if (region.latencyMsP99 > policy.criticalPathP99Ms) {
    reasons.push(`p99 latency ${region.latencyMsP99}ms exceeds ${policy.criticalPathP99Ms}ms target`);
  }

  if (region.replicationLagMs > policy.maxReplicationLagMs) {
    reasons.push(`replication lag ${region.replicationLagMs}ms exceeds ${policy.maxReplicationLagMs}ms target`);
  }

  if (region.errorRate > policy.maxErrorRate) {
    reasons.push(`error rate ${region.errorRate} exceeds ${policy.maxErrorRate} target`);
  }

  if (now - region.lastHeartbeatAt > policy.heartbeatTimeoutMs) {
    reasons.push(`heartbeat is stale by ${now - region.lastHeartbeatAt}ms`);
  }

  return {
    ...region,
    healthy: reasons.length === 0,
    reasons,
  };
}

export function selectFailoverRegion(assessments: RegionAssessment[]): RegionAssessment | undefined {
  return assessments
    .filter((region) => region.role === 'secondary' && region.healthy)
    .sort((left, right) => {
      if (left.replicationLagMs !== right.replicationLagMs) {
        return left.replicationLagMs - right.replicationLagMs;
      }

      if (left.latencyMsP99 !== right.latencyMsP99) {
        return left.latencyMsP99 - right.latencyMsP99;
      }

      return left.region.localeCompare(right.region);
    })[0];
}

export function buildDisasterRecoveryAssessment(
  regions: RegionHealth[],
  now: number = Date.now(),
  policy: DisasterRecoveryPolicy = DEFAULT_DR_POLICY,
): DisasterRecoveryAssessment {
  const assessments = regions.map((region) => assessRegion(region, now, policy));
  const primary = assessments.find((region) => region.role === 'primary');
  const secondaries = assessments.filter((region) => region.role === 'secondary');
  const observers = assessments.filter((region) => region.role === 'observer');
  const healthySecondaries = secondaries.filter((region) => region.healthy);
  const recommendedFailoverRegion = primary?.healthy ? undefined : selectFailoverRegion(assessments)?.region;
  const rpoMs = Math.max(0, ...assessments.map((region) => region.replicationLagMs));
  const rtoMs = recommendedFailoverRegion ? Math.max(1_000, rpoMs) : 0;
  const alerts: string[] = [];

  if (!primary) {
    alerts.push('no primary region is configured');
  } else if (!primary.healthy) {
    alerts.push(`primary region ${primary.region} is unhealthy`);
  }

  if (healthySecondaries.length < policy.minHealthySecondaries) {
    alerts.push(`healthy secondary count ${healthySecondaries.length} is below required ${policy.minHealthySecondaries}`);
  }

  if (recommendedFailoverRegion) {
    alerts.push(`fail over to ${recommendedFailoverRegion} using blue-green promotion`);
  }

  return {
    generatedAt: now,
    meetsAvailabilityTarget: Boolean(primary?.healthy) && healthySecondaries.length >= policy.minHealthySecondaries,
    primary,
    secondaries,
    observers,
    recommendedFailoverRegion,
    rpoMs,
    rtoMs,
    alerts,
  };
}
