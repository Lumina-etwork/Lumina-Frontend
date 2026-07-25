export type SecretKind = "database" | "api-key";
export type RotationStatus = "healthy" | "due-soon" | "overdue" | "rotating" | "failed";
export type RotationSeverity = "info" | "warning" | "critical";

export interface SecretDescriptor {
  id: string;
  service: string;
  kind: SecretKind;
  owner: string;
  lastRotatedAt: number;
  rotationIntervalMs: number;
  gracePeriodMs: number;
  version: string;
  canaryWeight: number;
  status?: RotationStatus;
}

export interface RotationFinding {
  secretId: string;
  service: string;
  severity: RotationSeverity;
  status: RotationStatus;
  message: string;
  dueAt: number;
}

export interface RotationPlan {
  secretId: string;
  service: string;
  kind: SecretKind;
  fromVersion: string;
  nextVersion: string;
  phases: Array<{ name: string; trafficPercent: number; action: string }>;
  rollback: string;
  estimatedCriticalPathMs: number;
}

export interface RotationReport {
  ok: boolean;
  generatedAt: number;
  findings: RotationFinding[];
  plans: RotationPlan[];
  metrics: {
    durationMs: number;
    criticalCount: number;
    warningCount: number;
    withinBudget: boolean;
  };
}
