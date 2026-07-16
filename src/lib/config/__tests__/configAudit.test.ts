/**
 * Runtime configuration auditing and drift detection tests.
 * Run with: npx tsx src/lib/config/__tests__/configAudit.test.ts
 */

import assert from "node:assert/strict";
import {
  analyzeCanary,
  CANARY_MIN_SAMPLES,
  diffConfigs,
  flattenConfig,
  PERFORMANCE_BUDGET_MS,
  redactSnapshot,
  redactValue,
  SOROBAN_BASELINE,
  type AuditReport,
  type DeploymentChannel,
  type RuntimeConfigSnapshot,
  type ServiceBaseline,
} from "../index";
import {
  ConfigAuditor,
  createDefaultConfigSources,
  resetConfigAuditorForTests,
} from "../../../services/configAudit";

let failures = 0;

function run(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

run("flattenConfig handles nested objects and empty snapshots", () => {
  assert.equal(flattenConfig({}).size, 0);
  const flat = flattenConfig({
    a: 1,
    nested: { b: "x", c: null },
  });
  assert.equal(flat.get("a"), 1);
  assert.equal(flat.get("nested.b"), "x");
  assert.equal(flat.get("nested.c"), null);
});

run("diffConfigs reports no findings when snapshots match", () => {
  const findings = diffConfigs(SOROBAN_BASELINE, {
    ...SOROBAN_BASELINE.expected,
  } as RuntimeConfigSnapshot);
  assert.equal(findings.length, 0);
});

run("diffConfigs detects changed, missing, and extra keys", () => {
  const findings = diffConfigs(SOROBAN_BASELINE, {
    serverUrl: "https://evil.example",
    unexpected: true,
  });
  const paths = findings.map((f) => f.path).sort();
  assert.deepEqual(paths, ["networkPassphrase", "serverUrl", "unexpected"]);
  const server = findings.find((f) => f.path === "serverUrl");
  assert.equal(server?.severity, "critical");
  assert.equal(server?.actual, "https://evil.example");
});

run("diffConfigs treats null vs value as drift and empty actual", () => {
  const baseline: ServiceBaseline = {
    service: "t",
    criticalPaths: ["flag"],
    warningPaths: [],
    expected: { flag: true, optional: null },
  };
  const findings = diffConfigs(baseline, { flag: null });
  assert.ok(findings.some((f) => f.path === "flag"));
  assert.ok(findings.some((f) => f.path === "optional"));
});

run("diffConfigs compares arrays by value equality", () => {
  const baseline: ServiceBaseline = {
    service: "arr",
    criticalPaths: ["list"],
    warningPaths: [],
    expected: { list: [1, 2, 3] },
  };
  assert.equal(diffConfigs(baseline, { list: [1, 2, 3] }).length, 0);
  assert.equal(diffConfigs(baseline, { list: [1, 2] }).length, 1);
});

run("redactValue masks sensitive paths and preserves safe values", () => {
  assert.equal(redactValue("apiKey", "secret-token"), "[REDACTED]");
  assert.equal(redactValue("sshCredentials.privateKey", "pk"), "[REDACTED]");
  assert.equal(redactValue("nodeName", "alpha"), "alpha");
  assert.equal(redactValue("apiKey", null), null);
  assert.equal(redactValue("apiKey", ""), "");
});

run("redactSnapshot recursively redacts nested secrets", () => {
  const redacted = redactSnapshot({
    nodeName: "n1",
    apiKey: "abc",
    sshCredentials: { privateKey: "pk", host: "h" },
  });
  assert.equal(redacted.nodeName, "n1");
  assert.equal(redacted.apiKey, "[REDACTED]");
  const ssh = redacted.sshCredentials as Record<string, unknown>;
  assert.equal(ssh.privateKey, "[REDACTED]");
  assert.equal(ssh.host, "h");
});

run("ConfigAuditor auditAll is clean against default baselines", () => {
  resetConfigAuditorForTests();
  const auditor = new ConfigAuditor({
    sources: createDefaultConfigSources(),
    channel: "stable",
    now: () => 1_000,
  });
  const report = auditor.auditAll();
  assert.equal(report.ok, true);
  assert.equal(report.findings.length, 0);
  assert.equal(report.metrics.withinBudget, true);
  assert.ok(report.metrics.durationMs < PERFORMANCE_BUDGET_MS);
});

run("intentional canary channel does not fail deployment audit", () => {
  const auditor = new ConfigAuditor({
    sources: createDefaultConfigSources({
      deployment: () => ({
        channel: "canary",
        releaseSlot: "blue",
      }),
    }),
    channel: "canary",
  });
  const report = auditor.auditAll();
  assert.equal(report.ok, true, JSON.stringify(report.findings));
  assert.equal(report.metrics.criticalCount, 0);
});

run("invalid deployment channel is critical drift", () => {
  const auditor = new ConfigAuditor({
    sources: createDefaultConfigSources({
      deployment: () => ({
        channel: "shadow-illegal",
        releaseSlot: "blue",
      }),
    }),
  });
  const report = auditor.auditService("deployment");
  assert.equal(report.ok, false);
  assert.ok(report.metrics.criticalCount >= 1);
  assert.ok(report.findings.some((f) => f.path === "channel"));
});

run("ConfigAuditor detects soroban drift and emits to subscribers", () => {
  let seen: AuditReport | null = null;
  const auditor = new ConfigAuditor({
    sources: createDefaultConfigSources({
      "soroban-rpc": () => ({
        serverUrl: "https://mainnet.example",
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      }),
    }),
    now: () => 2_000,
  });
  auditor.subscribe((report) => {
    seen = report;
  });
  const report = auditor.auditService("soroban-rpc");
  assert.equal(report.ok, false);
  assert.ok(report.metrics.criticalCount >= 1);
  assert.ok(seen);
  assert.equal(seen!.service, "soroban-rpc");
});

run("ConfigAuditor handles missing source and capture failures", () => {
  const auditor = new ConfigAuditor({
    sources: [],
    baselines: [SOROBAN_BASELINE],
  });
  const missing = auditor.auditService("soroban-rpc");
  assert.equal(missing.ok, false);
  assert.equal(missing.findings[0]?.actual, "missing-source");

  const failing = new ConfigAuditor({
    sources: [
      {
        service: "soroban-rpc",
        capture: () => {
          throw new Error("boom");
        },
      },
    ],
    baselines: [SOROBAN_BASELINE],
  });
  const failed = failing.auditService("soroban-rpc");
  assert.equal(failed.ok, false);
  assert.equal(failed.findings[0]?.path, "_capture");
  assert.equal(failed.findings[0]?.actual, "boom");
});

run("ConfigAuditor handles null capture results as empty snapshot", () => {
  const auditor = new ConfigAuditor({
    sources: [
      {
        service: "soroban-rpc",
        capture: () => null as unknown as RuntimeConfigSnapshot,
      },
    ],
    baselines: [SOROBAN_BASELINE],
  });
  const report = auditor.auditService("soroban-rpc");
  assert.equal(report.ok, false);
  assert.ok(report.findings.length >= 2);
});

run("ConfigAuditor history is bounded and canary analysis gates promotion", () => {
  const empty = new ConfigAuditor({
    sources: createDefaultConfigSources(),
    channel: "canary",
    historyLimit: 3,
  });
  const early = empty.analyzeCanaryPromotion();
  assert.equal(early.promote, false);
  assert.match(early.reason, /Insufficient samples/);

  const auditor = new ConfigAuditor({
    sources: createDefaultConfigSources(),
    channel: "canary",
    historyLimit: 3,
    now: () => 3_000,
  });

  for (let i = 0; i < 5; i += 1) {
    auditor.auditAll();
  }
  assert.equal(auditor.getHistory().length, 3);

  // Seed enough clean canary samples via history by constructing reports
  const cleanReports: AuditReport[] = Array.from(
    { length: CANARY_MIN_SAMPLES },
    (_, index) => ({
      ok: true,
      findings: [],
      metrics: {
        durationMs: 1,
        withinBudget: true,
        findingCount: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        auditedAt: index,
      },
      baselineVersion: "test",
      channel: "canary" as DeploymentChannel,
      service: "*",
    }),
  );
  const promote = analyzeCanary(cleanReports, "canary");
  assert.equal(promote.promote, true);

  const drifted = analyzeCanary(
    cleanReports.map((r, i) =>
      i === 0
        ? {
            ...r,
            ok: false,
            metrics: { ...r.metrics, findingCount: 1, criticalCount: 1 },
          }
        : r,
    ),
    "canary",
  );
  assert.equal(drifted.promote, false);
  assert.match(drifted.reason, /Critical drift/);
});

run("analyzeCanary rejects high non-critical drift rate", () => {
  const reports: AuditReport[] = Array.from({ length: 4 }, (_, index) => ({
    ok: false,
    findings: [],
    metrics: {
      durationMs: 1,
      withinBudget: true,
      findingCount: 1,
      criticalCount: 0,
      warningCount: 1,
      infoCount: 0,
      auditedAt: index,
    },
    baselineVersion: "test",
    channel: "canary" as DeploymentChannel,
    service: "*",
  }));
  const result = analyzeCanary(reports, "canary");
  assert.equal(result.promote, false);
  assert.match(result.reason, /Drift rate/);
});

run("unregisterSource removes a service from later audits", () => {
  const auditor = new ConfigAuditor({
    sources: createDefaultConfigSources(),
  });
  auditor.unregisterSource("mesh-network");
  auditor.setBaseline({
    service: "mesh-network",
    criticalPaths: [],
    warningPaths: ["maxPeers"],
    expected: { maxPeers: 10 },
  });
  const report = auditor.auditAll();
  assert.ok(
    report.findings.some(
      (f) => f.service === "mesh-network" && f.actual === "missing-source",
    ),
  );
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}

console.log("\nAll config audit tests passed");
