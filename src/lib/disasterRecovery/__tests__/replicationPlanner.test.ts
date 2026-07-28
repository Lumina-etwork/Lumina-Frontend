import assert from 'node:assert/strict';
import {
  buildDisasterRecoveryAssessment,
  DEFAULT_DR_POLICY,
  selectFailoverRegion,
  type RegionHealth,
} from '../index';

const now = Date.UTC(2026, 6, 25, 12, 0, 0);

const healthyRegions: RegionHealth[] = [
  {
    region: 'us-east-1',
    role: 'primary',
    latencyMsP99: 82,
    replicationLagMs: 900,
    errorRate: 0.001,
    lastHeartbeatAt: now - 2_000,
  },
  {
    region: 'us-west-2',
    role: 'secondary',
    latencyMsP99: 91,
    replicationLagMs: 1_200,
    errorRate: 0.002,
    lastHeartbeatAt: now - 2_000,
  },
];

const healthyAssessment = buildDisasterRecoveryAssessment(healthyRegions, now);
assert.equal(healthyAssessment.meetsAvailabilityTarget, true);
assert.equal(healthyAssessment.recommendedFailoverRegion, undefined);
assert.deepEqual(healthyAssessment.alerts, []);

const degradedRegions: RegionHealth[] = [
  {
    ...healthyRegions[0],
    latencyMsP99: 140,
    errorRate: 0.03,
  },
  {
    ...healthyRegions[1],
    replicationLagMs: 750,
  },
  {
    region: 'eu-central-1',
    role: 'secondary',
    latencyMsP99: 88,
    replicationLagMs: 650,
    errorRate: 0.001,
    lastHeartbeatAt: now - 1_000,
  },
];

const degradedAssessment = buildDisasterRecoveryAssessment(degradedRegions, now);
assert.equal(degradedAssessment.meetsAvailabilityTarget, false);
assert.equal(degradedAssessment.recommendedFailoverRegion, 'eu-central-1');
assert.equal(degradedAssessment.rpoMs, 900);
assert.ok(degradedAssessment.alerts.includes('primary region us-east-1 is unhealthy'));
assert.ok(degradedAssessment.alerts.includes('fail over to eu-central-1 using blue-green promotion'));

const staleRegion = buildDisasterRecoveryAssessment(
  [{ ...healthyRegions[0], lastHeartbeatAt: now - DEFAULT_DR_POLICY.heartbeatTimeoutMs - 1 }],
  now,
);
assert.equal(staleRegion.primary?.healthy, false);
assert.match(staleRegion.primary?.reasons.join('\n') ?? '', /heartbeat is stale/);

assert.equal(
  selectFailoverRegion(degradedAssessment.secondaries)?.region,
  'eu-central-1',
  'lowest-lag healthy secondary should be selected',
);

console.log('replicationPlanner tests passed');
