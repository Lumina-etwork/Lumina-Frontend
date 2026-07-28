import assert from "node:assert/strict";
import { buildRotationPlan, createRotationReport, DAY_MS, evaluateSecret, redactSecretTelemetry, ROTATION_PERFORMANCE_BUDGET_MS, type SecretDescriptor } from "../index";

let failures = 0;
function run(name: string, fn: () => void): void {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { failures += 1; console.error(`✗ ${name}`); console.error(error); }
}

const now = Date.UTC(2026, 6, 25);
const base: SecretDescriptor = { id: "db", service: "postgres", kind: "database", owner: "platform", lastRotatedAt: now - 91 * DAY_MS, rotationIntervalMs: 90 * DAY_MS, gracePeriodMs: 7 * DAY_MS, version: "v1", canaryWeight: 5 };

run("evaluateSecret classifies due-soon credentials", () => {
  const finding = evaluateSecret(base, now);
  assert.equal(finding.status, "due-soon");
  assert.equal(finding.severity, "warning");
});

run("evaluateSecret escalates after the grace period", () => {
  const finding = evaluateSecret({ ...base, lastRotatedAt: now - 100 * DAY_MS }, now);
  assert.equal(finding.status, "overdue");
  assert.equal(finding.severity, "critical");
});

run("buildRotationPlan includes canary and blue-green phases", () => {
  const plan = buildRotationPlan(base, 123);
  assert.equal(plan.nextVersion, "v1-r123");
  assert.ok(plan.phases.some((phase) => phase.name === "canary"));
  assert.ok(plan.phases.some((phase) => phase.name === "blue-green"));
  assert.ok(plan.estimatedCriticalPathMs <= ROTATION_PERFORMANCE_BUDGET_MS);
});

run("createRotationReport emits actionable plans and budget metrics", () => {
  const report = createRotationReport([base], now, Date.now());
  assert.equal(report.metrics.warningCount, 1);
  assert.equal(report.plans.length, 1);
  assert.equal(report.metrics.withinBudget, true);
});

run("redactSecretTelemetry strips sensitive fields", () => {
  const redacted = redactSecretTelemetry({ apiKey: "abc", service: "safe", password: "pw" });
  assert.equal(redacted.apiKey, "[REDACTED]");
  assert.equal(redacted.password, "[REDACTED]");
  assert.equal(redacted.service, "safe");
});

if (failures > 0) process.exit(1);
