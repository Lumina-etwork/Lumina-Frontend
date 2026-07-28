export type SloSeverity = "ok" | "warning" | "critical";

export interface SloObjective {
  id: string;
  name: string;
  service: string;
  target: number;
  windowDays: number;
  latencyP99TargetMs?: number;
  burnRateWarning: number;
  burnRateCritical: number;
}

export interface SloMetricSample {
  timestamp: string;
  service: string;
  goodEvents: number;
  totalEvents: number;
  latencyP99Ms: number;
}

export interface SloEvaluation {
  objective: SloObjective;
  availability: number;
  errorBudget: number;
  errorBudgetConsumed: number;
  burnRate: number;
  latencyP99Ms: number;
  latencyBreached: boolean;
  severity: SloSeverity;
  alertSummary: string;
}
