import assert from 'node:assert/strict';
import { buildPagerDutyTrigger, listRunbooks, selectRunbook } from '../runbookAutomation';

const runbooks = listRunbooks();
assert.ok(runbooks.length >= 3, 'documents system-wide runbooks for multiple services');
assert.equal(selectRunbook(' FRONTEND ').id, 'frontend-availability');

const payload = buildPagerDutyTrigger(
  {
    service: 'api',
    severity: 'critical',
    summary: 'P99 latency above 100ms',
    source: 'slo-monitor',
    timestamp: '2026-07-25T00:00:00.000Z',
    details: { p99Ms: 142, targetMs: 100 },
  },
  'pd-test-key',
);

assert.equal(payload.event_action, 'trigger');
assert.equal(payload.routing_key, 'pd-test-key');
assert.equal(payload.dedup_key, 'api:critical:p99-latency-above-100ms');
assert.equal(payload.payload.class, 'api-latency-p99');
assert.equal(payload.payload.custom_details.p99Ms, 142);
assert.deepEqual(payload.links, [
  { href: 'https://grafana.lumina.example/d/api-latency', text: 'API critical path latency breach dashboard' },
]);

assert.throws(
  () => buildPagerDutyTrigger({ service: 'api', severity: 'critical', summary: 'x', source: 'test' }, '   '),
  /routing key is required/,
);

console.log('runbookAutomation tests passed');
