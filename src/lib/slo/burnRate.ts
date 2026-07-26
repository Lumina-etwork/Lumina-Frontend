import type { SloEvaluation, SloMetricSample, SloObjective, SloSeverity } from "./types";

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export function calculateAvailability(samples: SloMetricSample[]): number {
  const totals = samples.reduce(
    (acc, sample) => ({ good: acc.good + sample.goodEvents, total: acc.total + sample.totalEvents }),
    { good: 0, total: 0 },
  );

  if (totals.total === 0) return 1;
  return clamp(totals.good / totals.total);
}

export function calculateBurnRate(objective: SloObjective, availability: number): number {
  const allowedFailureRatio = 1 - objective.target;
  if (allowedFailureRatio <= 0) return availability >= 1 ? 0 : Number.POSITIVE_INFINITY;
  const actualFailureRatio = 1 - availability;
  return actualFailureRatio / allowedFailureRatio;
}

export function evaluateSlo(objective: SloObjective, samples: SloMetricSample[]): SloEvaluation {
  const scopedSamples = samples.filter((sample) => sample.service === objective.service);
  const availability = calculateAvailability(scopedSamples);
  const burnRate = calculateBurnRate(objective, availability);
  const latencyP99Ms = scopedSamples.reduce((max, sample) => Math.max(max, sample.latencyP99Ms), 0);
  const latencyBreached = objective.latencyP99TargetMs !== undefined && latencyP99Ms > objective.latencyP99TargetMs;
  const errorBudget = 1 - objective.target;
  const errorBudgetConsumed = errorBudget === 0 ? 0 : clamp((1 - availability) / errorBudget);

  let severity: SloSeverity = "ok";
  if (burnRate >= objective.burnRateCritical || latencyBreached) {
    severity = "critical";
  } else if (burnRate >= objective.burnRateWarning || errorBudgetConsumed >= 0.75) {
    severity = "warning";
  }

  return {
    objective,
    availability,
    errorBudget,
    errorBudgetConsumed,
    burnRate,
    latencyP99Ms,
    latencyBreached,
    severity,
    alertSummary: buildAlertSummary(objective, severity, burnRate, latencyBreached),
  };
}

export function evaluateSloPortfolio(objectives: SloObjective[], samples: SloMetricSample[]) {
  return objectives.map((objective) => evaluateSlo(objective, samples));
}

function buildAlertSummary(
  objective: SloObjective,
  severity: SloSeverity,
  burnRate: number,
  latencyBreached: boolean,
) {
  if (severity === "ok") return `${objective.name} is within SLO.`;
  const reasons = [`burn rate ${burnRate.toFixed(2)}x`];
  if (latencyBreached) reasons.push(`P99 latency over ${objective.latencyP99TargetMs}ms`);
  return `${objective.name} ${severity} alert: ${reasons.join(", ")}.`;
}
