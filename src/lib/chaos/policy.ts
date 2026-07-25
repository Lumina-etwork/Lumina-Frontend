import type {
  ChaosExperiment,
  ChaosSafetyPolicy,
  ChaosService,
  ChaosValidationFinding,
  ChaosValidationReport,
} from "./types";

export const STAGING_CHAOS_POLICY: ChaosSafetyPolicy = {
  environment: "staging",
  maxBlastRadiusPercent: 10,
  maxDurationMinutes: 30,
  latencyP99BudgetMs: 100,
  availabilityTargetPercent: 99.99,
  requireSecurityReview: true,
  requireCanary: true,
  requireBlueGreenReady: true,
};

export function validateChaosPlan(
  services: ChaosService[],
  experiments: ChaosExperiment[],
  policy: ChaosSafetyPolicy = STAGING_CHAOS_POLICY,
): ChaosValidationReport {
  const findings: ChaosValidationFinding[] = [];
  const serviceByName = new Map(services.map((service) => [service.name, service]));
  const coveredServices = new Set<string>();

  for (const service of services) {
    if (service.criticalPath && service.p99LatencyMs > policy.latencyP99BudgetMs) {
      findings.push({
        severity: "critical",
        code: "LATENCY_BUDGET_EXCEEDED",
        service: service.name,
        message: `${service.name} p99 latency ${service.p99LatencyMs}ms exceeds ${policy.latencyP99BudgetMs}ms`,
      });
    }

    if (service.availabilityPercent < policy.availabilityTargetPercent) {
      findings.push({
        severity: "critical",
        code: "AVAILABILITY_TARGET_MISSED",
        service: service.name,
        message: `${service.name} availability ${service.availabilityPercent}% is below ${policy.availabilityTargetPercent}%`,
      });
    }
  }

  for (const experiment of experiments) {
    const service = serviceByName.get(experiment.service);

    if (!service) {
      findings.push({
        severity: "critical",
        code: "UNKNOWN_SERVICE",
        experimentId: experiment.id,
        message: `${experiment.id} targets unknown service ${experiment.service}`,
      });
      continue;
    }

    coveredServices.add(service.name);

    if (experiment.blastRadiusPercent > policy.maxBlastRadiusPercent) {
      findings.push({
        severity: "critical",
        code: "BLAST_RADIUS_EXCEEDED",
        service: service.name,
        experimentId: experiment.id,
        message: `${experiment.id} blast radius ${experiment.blastRadiusPercent}% exceeds ${policy.maxBlastRadiusPercent}%`,
      });
    }

    if (experiment.durationMinutes > policy.maxDurationMinutes) {
      findings.push({
        severity: "warning",
        code: "DURATION_EXCEEDED",
        service: service.name,
        experimentId: experiment.id,
        message: `${experiment.id} duration ${experiment.durationMinutes}m exceeds ${policy.maxDurationMinutes}m`,
      });
    }

    if (policy.requireSecurityReview && !experiment.requiresSecurityReview) {
      findings.push({
        severity: "warning",
        code: "SECURITY_REVIEW_REQUIRED",
        service: service.name,
        experimentId: experiment.id,
        message: `${experiment.id} must be approved by security before staging execution`,
      });
    }
  }

  for (const service of services) {
    if (!coveredServices.has(service.name)) {
      findings.push({
        severity: service.tier === "critical" ? "critical" : "warning",
        code: "SERVICE_NOT_COVERED",
        service: service.name,
        message: `${service.name} has no chaos experiment coverage`,
      });
    }
  }

  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length;
  const warningFindings = findings.filter((finding) => finding.severity === "warning").length;

  return {
    ok: criticalFindings === 0,
    promoteCanary: criticalFindings === 0 && warningFindings === 0,
    findings,
    metrics: {
      servicesCovered: coveredServices.size,
      experimentsPlanned: experiments.length,
      criticalFindings,
      warningFindings,
    },
  };
}
