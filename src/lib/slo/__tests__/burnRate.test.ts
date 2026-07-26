import assert from "node:assert/strict";
import { evaluateSlo } from "../burnRate";
import type { SloMetricSample, SloObjective } from "../types";

const objective: SloObjective = {
  id: "api-availability",
  name: "API availability",
  service: "api-gateway",
  target: 0.9999,
  windowDays: 30,
  latencyP99TargetMs: 100,
  burnRateWarning: 2,
  burnRateCritical: 14,
};

const samples: SloMetricSample[] = [
  { timestamp: "2026-07-25T00:00:00Z", service: "api-gateway", goodEvents: 9997, totalEvents: 10000, latencyP99Ms: 82 },
  { timestamp: "2026-07-25T00:01:00Z", service: "api-gateway", goodEvents: 9999, totalEvents: 10000, latencyP99Ms: 91 },
];

const warning = evaluateSlo(objective, samples);
assert.equal(warning.severity, "warning");
assert.equal(warning.latencyBreached, false);
assert.ok(warning.burnRate > 1.9);
assert.ok(warning.errorBudgetConsumed > 0.75);

const critical = evaluateSlo(objective, [
  ...samples,
  { timestamp: "2026-07-25T00:02:00Z", service: "api-gateway", goodEvents: 10000, totalEvents: 10000, latencyP99Ms: 142 },
]);
assert.equal(critical.severity, "critical");
assert.equal(critical.latencyBreached, true);

const empty = evaluateSlo(objective, []);
assert.equal(empty.severity, "ok");
assert.equal(empty.availability, 1);
assert.equal(empty.burnRate, 0);
