import type { RotationFinding, RotationPlan, RotationReport, SecretDescriptor } from "./types";

export const ROTATION_PERFORMANCE_BUDGET_MS = 100;
export const DAY_MS = 24 * 60 * 60 * 1000;

export function evaluateSecret(secret: SecretDescriptor, now = Date.now()): RotationFinding {
  const dueAt = secret.lastRotatedAt + secret.rotationIntervalMs;
  const graceEndsAt = dueAt + secret.gracePeriodMs;
  const effectiveStatus = secret.status ?? (now > graceEndsAt ? "overdue" : now >= dueAt ? "due-soon" : "healthy");
  const severity = effectiveStatus === "overdue" || effectiveStatus === "failed" ? "critical" : effectiveStatus === "due-soon" ? "warning" : "info";
  return {
    secretId: secret.id,
    service: secret.service,
    status: effectiveStatus,
    severity,
    dueAt,
    message: `${secret.kind} credential for ${secret.service} is ${effectiveStatus}`,
  };
}

export function buildRotationPlan(secret: SecretDescriptor, sequence = Date.now()): RotationPlan {
  const nextVersion = `${secret.version}-r${sequence}`;
  return {
    secretId: secret.id,
    service: secret.service,
    kind: secret.kind,
    fromVersion: secret.version,
    nextVersion,
    estimatedCriticalPathMs: Math.min(ROTATION_PERFORMANCE_BUDGET_MS, 8 + Math.round(secret.canaryWeight * 40)),
    phases: [
      { name: "prepare", trafficPercent: 0, action: "Create new secret version and validate dependent health checks." },
      { name: "canary", trafficPercent: secret.canaryWeight, action: "Route a bounded canary cohort to the new secret version." },
      { name: "blue-green", trafficPercent: 100, action: "Promote green deployment after canary passes, keeping blue credentials active for rollback." },
      { name: "revoke-old", trafficPercent: 100, action: "Revoke the previous version after the grace window and audit log confirmation." },
    ],
    rollback: `Return ${secret.service} to ${secret.version} and disable ${nextVersion}.`,
  };
}

export function createRotationReport(secrets: SecretDescriptor[], now = Date.now(), startedAt = now): RotationReport {
  const findings = secrets.map((secret) => evaluateSecret(secret, now));
  const actionable = findings.filter((finding) => finding.severity !== "info");
  const byId = new Map(secrets.map((secret) => [secret.id, secret]));
  const plans = actionable.map((finding, index) => buildRotationPlan(byId.get(finding.secretId)!, now + index));
  const durationMs = Math.max(0, Date.now() - startedAt);
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const warningCount = findings.filter((finding) => finding.severity === "warning").length;
  return { ok: criticalCount === 0, generatedAt: now, findings, plans, metrics: { durationMs, criticalCount, warningCount, withinBudget: durationMs < ROTATION_PERFORMANCE_BUDGET_MS } };
}

export function redactSecretTelemetry<T extends Record<string, unknown>>(payload: T): T {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => /secret|password|token|credential|api[-_]?key/i.test(key) ? [key, "[REDACTED]"] : [key, value])) as T;
}
