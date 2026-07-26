import assert from "node:assert/strict";
import { STAGING_CHAOS_POLICY, validateChaosPlan } from "../policy";
import type { ChaosExperiment, ChaosService } from "../types";

interface FailedTest { name: string; error: unknown }
const failures: FailedTest[] = [];
let passed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    failures.push({ name, error: err });
  }
}

const services: ChaosService[] = [
  { name: "web", tier: "critical", criticalPath: true, p99LatencyMs: 88, availabilityPercent: 99.995 },
  { name: "api", tier: "critical", criticalPath: true, p99LatencyMs: 92, availabilityPercent: 99.991 },
  { name: "telemetry", tier: "standard", p99LatencyMs: 120, availabilityPercent: 99.99 },
];

const experiments: ChaosExperiment[] = [
  { id: "web-latency", service: "web", type: "latency", blastRadiusPercent: 5, durationMinutes: 10, expectedRecoveryMinutes: 2, requiresSecurityReview: true },
  { id: "api-dependency", service: "api", type: "dependency_error", blastRadiusPercent: 5, durationMinutes: 15, expectedRecoveryMinutes: 5, requiresSecurityReview: true },
  { id: "telemetry-restart", service: "telemetry", type: "service_restart", blastRadiusPercent: 10, durationMinutes: 10, expectedRecoveryMinutes: 3, requiresSecurityReview: true },
];

async function run() {
  console.log("\nchaos policy tests");

  await test("healthy staging plan is eligible for canary promotion", () => {
    const report = validateChaosPlan(services, experiments);
    assert.equal(report.ok, true);
    assert.equal(report.promoteCanary, true);
    assert.equal(report.metrics.servicesCovered, 3);
    assert.equal(report.metrics.criticalFindings, 0);
  });

  await test("critical paths must stay under the 100ms p99 budget", () => {
    const report = validateChaosPlan([
      { ...services[0], p99LatencyMs: STAGING_CHAOS_POLICY.latencyP99BudgetMs + 1 },
    ], [experiments[0]]);
    assert.equal(report.ok, false);
    assert.equal(report.findings[0].code, "LATENCY_BUDGET_EXCEEDED");
  });

  await test("blast radius violations block the plan", () => {
    const report = validateChaosPlan(services, [
      { ...experiments[0], blastRadiusPercent: STAGING_CHAOS_POLICY.maxBlastRadiusPercent + 1 },
      experiments[1],
      experiments[2],
    ]);
    assert.equal(report.ok, false);
    assert.ok(report.findings.some((finding) => finding.code === "BLAST_RADIUS_EXCEEDED"));
  });

  await test("security review gaps prevent automatic canary promotion", () => {
    const report = validateChaosPlan(services, [
      { ...experiments[0], requiresSecurityReview: false },
      experiments[1],
      experiments[2],
    ]);
    assert.equal(report.ok, true);
    assert.equal(report.promoteCanary, false);
    assert.ok(report.findings.some((finding) => finding.code === "SECURITY_REVIEW_REQUIRED"));
  });

  await test("uncovered critical services are blocking findings", () => {
    const report = validateChaosPlan(services, [experiments[0], experiments[2]]);
    assert.equal(report.ok, false);
    assert.ok(report.findings.some((finding) => finding.service === "api" && finding.code === "SERVICE_NOT_COVERED"));
  });

  if (failures.length > 0) {
    console.error(`\n${failures.length} chaos policy test(s) failed`);
    process.exit(1);
  }

  console.log(`\n${passed} chaos policy test(s) passed`);
}

run();
