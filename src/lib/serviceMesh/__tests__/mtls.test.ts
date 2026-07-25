/**
 * Service mesh mutual TLS policy tests.
 * Run with: npx tsx src/lib/serviceMesh/__tests__/mtls.test.ts
 */

import assert from "node:assert/strict";
import {
  meshMtlsPolicySnapshot,
  validateMeshMtlsPolicy,
} from "../mtls";

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

run("strict default mTLS policy has no findings", () => {
  assert.deepEqual(validateMeshMtlsPolicy(meshMtlsPolicySnapshot()), []);
});

run("disabled or permissive mTLS is critical drift", () => {
  const disabled = validateMeshMtlsPolicy(
    meshMtlsPolicySnapshot({ enabled: false, mode: "PERMISSIVE" }),
  );
  assert.ok(disabled.some((f) => f.path === "mtls.enabled"));
  assert.ok(disabled.some((f) => f.path === "mtls.mode"));
  assert.ok(disabled.every((f) => f.severity === "critical"));
});

run("certificate and identity mismatches block promotion", () => {
  const findings = validateMeshMtlsPolicy(
    meshMtlsPolicySnapshot({
      certificateProvider: "self-signed",
      identityTrustDomain: "example.invalid",
      minTlsVersion: "TLSv1.2",
      peerAuthenticationRequired: false,
    }),
  );
  assert.deepEqual(
    findings.map((f) => f.path),
    [
      "mtls.certificateProvider",
      "mtls.identityTrustDomain",
      "mtls.minTlsVersion",
      "mtls.peerAuthenticationRequired",
    ],
  );
  assert.ok(findings.every((f) => f.severity === "critical"));
});

run("stale rotation and missing telemetry are warning drift", () => {
  const findings = validateMeshMtlsPolicy(
    meshMtlsPolicySnapshot({ rotationHours: 72, telemetryRequired: false }),
  );
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.severity === "warning"));
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}

console.log("\nAll service mesh mTLS tests passed");
