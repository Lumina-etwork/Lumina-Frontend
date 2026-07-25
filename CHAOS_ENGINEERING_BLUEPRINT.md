# Chaos Engineering Blueprint for Staging

This blueprint defines how Lumina runs controlled chaos engineering experiments in staging before a blue-green or canary promotion. It is intentionally system-wide: frontend, API, telemetry, background workers, and external dependency adapters must be represented before the plan can be promoted.

## Objectives

- Validate that critical user paths remain below **100ms P99** during injected failures.
- Preserve the service availability target of **99.99%** during staging experiments.
- Require a security review for every experiment that changes traffic, credentials, dependency behavior, or data access patterns.
- Use blue-green deployment slots and canary analysis before enabling a wider experiment cohort.
- Produce monitoring evidence, alerts, and runbook updates for every tested failure mode.

## Architecture

```text
Experiment proposal
  ├─ service inventory and dependency map
  ├─ safety policy validation in src/lib/chaos/policy.ts
  ├─ security review and staged approval
  ├─ blue-green staging slot selection
  ├─ canary cohort execution
  ├─ telemetry, dashboard, and alert review
  └─ promotion / rollback decision
```

The implementation starts with a pure policy engine so staging plans can be checked in CI, dashboards, or release tooling without invoking a live chaos provider. Provider-specific adapters can submit validated experiments to tools such as Kubernetes, Gremlin, LitmusChaos, or cloud fault-injection services.

## Safety Policy

The default staging policy is exported as `STAGING_CHAOS_POLICY` and enforces:

| Control | Default |
| --- | --- |
| Environment | `staging` |
| Maximum blast radius | `10%` |
| Maximum duration | `30 minutes` |
| Critical-path latency budget | `100ms P99` |
| Availability target | `99.99%` |
| Security review | Required |
| Canary analysis | Required |
| Blue-green readiness | Required |

Validation returns blocking critical findings for unknown services, uncovered critical services, availability misses, critical-path latency budget misses, and blast-radius violations. Non-blocking warnings cover duration overruns and missing security-review flags; warnings keep the plan reviewable but prevent automatic canary promotion.

## Experiment Categories

- **Latency injection:** add bounded delay to frontend/API calls and dependency clients.
- **Packet loss:** simulate intermittent network loss between UI, API, RPC, and telemetry endpoints.
- **Service restart:** validate graceful recovery from worker or service restarts.
- **Dependency error:** force RPC, cache, auth, or telemetry dependency failures.
- **CPU pressure:** verify UI and worker degradation under constrained compute.
- **Memory pressure:** validate limits, restart policy, and user-facing error handling.

## Monitoring and Alerting

Every experiment must capture:

- P50/P95/P99 latency by critical path and service.
- Availability and error-budget burn rate.
- Error rate by status code and exception class.
- Recovery time objective evidence.
- Canary cohort size, affected services, and rollback decision.
- Security-review approval reference.

Alerts should page only for sustained threshold breaches in staging; short-lived expected signals should route to the experiment channel with the experiment ID attached.

## Blue-Green and Canary Workflow

1. Deploy the candidate build to the idle blue or green staging slot.
2. Run `npm run test:chaos` to validate the proposed service inventory and experiment plan.
3. Start with a canary cohort at or below the policy blast-radius limit.
4. Compare latency, availability, and error metrics against the stable slot.
5. Promote only when there are no critical findings and no warnings requiring manual review.
6. Roll back immediately if critical-path P99 exceeds 100ms, availability drops below 99.99%, or security controls fail.

## Runbook Checklist

- [ ] Service inventory includes all critical, standard, and experimental services.
- [ ] Dependency map is current and reviewed by service owners.
- [ ] Every critical service has at least one experiment.
- [ ] Every experiment has security-review approval.
- [ ] Dashboards and alerts include the experiment ID.
- [ ] Rollback owner and communication channel are assigned.
- [ ] Post-experiment findings are attached to the release record.
