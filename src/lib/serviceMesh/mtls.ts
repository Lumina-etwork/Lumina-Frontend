/**
 * Service mesh mutual TLS policy helpers.
 *
 * The frontend cannot terminate mesh traffic, but it can validate and surface
 * the declared runtime posture used by platform services before blue-green or
 * canary promotion. These helpers are pure and synchronous so they can run on
 * the config-audit critical path without network I/O.
 */

import type { DriftFinding, RuntimeConfigSnapshot } from "../config";

export type MtlsMode = "STRICT" | "PERMISSIVE" | "DISABLED";

export interface MeshMtlsPolicy {
  enabled: boolean;
  mode: MtlsMode;
  certificateProvider: string;
  identityTrustDomain: string;
  minTlsVersion: "TLSv1.2" | "TLSv1.3";
  peerAuthenticationRequired: boolean;
  rotationHours: number;
  telemetryRequired: boolean;
}

export const REQUIRED_MESH_MTLS_POLICY: MeshMtlsPolicy = {
  enabled: true,
  mode: "STRICT",
  certificateProvider: "spiffe-ca",
  identityTrustDomain: "lumina.local",
  minTlsVersion: "TLSv1.3",
  peerAuthenticationRequired: true,
  rotationHours: 24,
  telemetryRequired: true,
};

export function meshMtlsPolicySnapshot(
  overrides: Partial<MeshMtlsPolicy> = {},
): RuntimeConfigSnapshot {
  return {
    mtls: {
      ...REQUIRED_MESH_MTLS_POLICY,
      ...overrides,
    },
  };
}

function readMtls(snapshot: RuntimeConfigSnapshot): Partial<MeshMtlsPolicy> {
  const mtls = snapshot.mtls;
  return typeof mtls === "object" && mtls !== null && !Array.isArray(mtls)
    ? (mtls as Partial<MeshMtlsPolicy>)
    : {};
}

export function validateMeshMtlsPolicy(
  snapshot: RuntimeConfigSnapshot,
  service = "mesh-network",
): DriftFinding[] {
  const mtls = readMtls(snapshot);
  const findings: DriftFinding[] = [];

  const criticalChecks: Array<keyof MeshMtlsPolicy> = [
    "enabled",
    "mode",
    "certificateProvider",
    "identityTrustDomain",
    "minTlsVersion",
    "peerAuthenticationRequired",
  ];

  for (const key of criticalChecks) {
    if (mtls[key] !== REQUIRED_MESH_MTLS_POLICY[key]) {
      findings.push({
        path: `mtls.${key}`,
        expected: REQUIRED_MESH_MTLS_POLICY[key],
        actual: mtls[key],
        severity: "critical",
        service,
      });
    }
  }

  if (
    typeof mtls.rotationHours !== "number" ||
    mtls.rotationHours < 1 ||
    mtls.rotationHours > REQUIRED_MESH_MTLS_POLICY.rotationHours
  ) {
    findings.push({
      path: "mtls.rotationHours",
      expected: `1-${REQUIRED_MESH_MTLS_POLICY.rotationHours}`,
      actual: mtls.rotationHours,
      severity: "warning",
      service,
    });
  }

  if (mtls.telemetryRequired !== true) {
    findings.push({
      path: "mtls.telemetryRequired",
      expected: true,
      actual: mtls.telemetryRequired,
      severity: "warning",
      service,
    });
  }

  return findings.sort((a, b) => a.path.localeCompare(b.path));
}
