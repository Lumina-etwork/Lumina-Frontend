export type ChaosEnvironment = "staging" | "production";

export type ChaosServiceTier = "critical" | "standard" | "experimental";

export type ChaosExperimentType =
  | "latency"
  | "packet_loss"
  | "service_restart"
  | "dependency_error"
  | "cpu_pressure"
  | "memory_pressure";

export interface ChaosService {
  name: string;
  tier: ChaosServiceTier;
  criticalPath?: boolean;
  dependencies?: string[];
  p99LatencyMs: number;
  availabilityPercent: number;
}

export interface ChaosExperiment {
  id: string;
  service: string;
  type: ChaosExperimentType;
  blastRadiusPercent: number;
  durationMinutes: number;
  expectedRecoveryMinutes: number;
  requiresSecurityReview?: boolean;
}

export interface ChaosSafetyPolicy {
  environment: ChaosEnvironment;
  maxBlastRadiusPercent: number;
  maxDurationMinutes: number;
  latencyP99BudgetMs: number;
  availabilityTargetPercent: number;
  requireSecurityReview: boolean;
  requireCanary: boolean;
  requireBlueGreenReady: boolean;
}

export interface ChaosValidationFinding {
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  service?: string;
  experimentId?: string;
}

export interface ChaosValidationReport {
  ok: boolean;
  promoteCanary: boolean;
  findings: ChaosValidationFinding[];
  metrics: {
    servicesCovered: number;
    experimentsPlanned: number;
    criticalFindings: number;
    warningFindings: number;
  };
}
