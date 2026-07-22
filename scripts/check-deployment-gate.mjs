#!/usr/bin/env node

/**
 * Deployment gate checker for dependency vulnerability scans.
 *
 * Reads aggregated results from CI audit steps and decides whether
 * the current build can proceed (block on critical vulnerabilities).
 *
 * Environment variables:
 *   DEPLOY_CHANNEL       - "stable" | "canary" | "blue" | "green"
 *   PNPM_AUDIT_EXIT_CODE - exit code from pnpm audit step
 *   NPM_AUDIT_EXIT_CODE  - exit code from npm audit step
 *   OSV_RESULTS_FILE     - path to OSV-Scanner JSON output
 */

import fs from "node:fs";
import path from "node:path";

const DEPLOY_CHANNEL = process.env.DEPLOY_CHANNEL ?? "stable";
const PNPM_AUDIT_EXIT_CODE = parseInt(
  process.env.PNPM_AUDIT_EXIT_CODE ?? "0",
  10,
);
const NPM_AUDIT_EXIT_CODE = parseInt(
  process.env.NPM_AUDIT_EXIT_CODE ?? "0",
  10,
);
const OSV_RESULTS_FILE = process.env.OSV_RESULTS_FILE ?? "";

const findings = [];
const criticalFindings = [];

function recordFinding(source, id, severity, packageName, title) {
  const finding = { source, id, severity, packageName, title };
  findings.push(finding);
  if (severity === "critical") {
    criticalFindings.push(finding);
  }
}

// Layer 1: pnpm audit exit code
if (PNPM_AUDIT_EXIT_CODE !== 0) {
  // pnpm exits non-zero when vulnerabilities at or above --audit-level
  recordFinding("pnpm-audit", "AUDIT_FAIL", "high", "*", "pnpm audit found vulnerabilities");
}

// Layer 2: npm audit exit code
if (NPM_AUDIT_EXIT_CODE !== 0) {
  recordFinding("npm-audit", "AUDIT_FAIL", "high", "*", "npm audit found vulnerabilities");
}

// Layer 3: OSV-Scanner results
if (OSV_RESULTS_FILE && fs.existsSync(OSV_RESULTS_FILE)) {
  try {
    const osvRaw = fs.readFileSync(OSV_RESULTS_FILE, "utf-8");
    const osvData = JSON.parse(osvRaw);

    const results = osvData.results ?? [];
    for (const pkg of results) {
      const packageName = pkg.package?.name ?? "unknown";
      const vulns = pkg.vulnerabilities ?? [];
      for (const vuln of vulns) {
        const id = vuln.id ?? "OSV-UNKNOWN";
        const title = vuln.summary ?? vuln.id ?? "Unknown vulnerability";
        const severity = vuln.database_specific?.severity ?? "high";
        recordFinding("osv-scanner", id, severity, packageName, title);
      }
    }
  } catch (error) {
    recordFinding(
      "osv-scanner",
      "PARSE_ERROR",
      "high",
      "*",
      `Failed to parse OSV results: ${error.message}`,
    );
  }
}

// Gate decision
const blocked = criticalFindings.length > 0;

const gateResult = {
  passed: !blocked,
  channel: DEPLOY_CHANNEL,
  totalFindings: findings.length,
  criticalCount: criticalFindings.length,
  blocked,
  reason: blocked
    ? `Blocked: ${criticalFindings.length} critical vulnerabilities found`
    : "All gates passed",
  findings: findings.slice(0, 50), // cap output size
  timestamp: new Date().toISOString(),
};

// Write gate result for upload artifact
const outputPath = path.resolve("gate-result.json");
fs.writeFileSync(outputPath, JSON.stringify(gateResult, null, 2));

// Summary to stdout
console.log(`\n=== Deployment Gate Check ===`);
console.log(`Channel:    ${DEPLOY_CHANNEL}`);
console.log(`Findings:   ${findings.length}`);
console.log(`Critical:   ${criticalFindings.length}`);
console.log(`Passed:     ${gateResult.passed}`);
console.log(`Reason:     ${gateResult.reason}`);
console.log(`\nResult written to ${outputPath}`);

// Exit non-zero if blocked
if (blocked) {
  process.exitCode = 1;
}
