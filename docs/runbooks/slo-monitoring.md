# SLO Monitoring and Burn Rate Alerts

## Architecture

Lumina evaluates service-level objectives with a shared SLO library. Each service publishes good/total event counters and P99 latency samples. The evaluator calculates availability, consumed error budget, burn rate, and latency breaches, then classifies each objective as `ok`, `warning`, or `critical`.

## Objectives

- Critical-path latency: P99 must remain below 100ms.
- Availability: production services target 99.99% uptime over the configured SLO window.
- Alerting: warning alerts start at 2x burn rate or 75% budget consumed; critical alerts start at 14x burn rate or any critical-path latency breach.

## Dashboards and operations

The SLO dashboard is available at `/dashboard/slo`. During incidents, operators should validate the affected service, check the burn-rate multiplier, compare P99 latency to the 100ms target, and page the owning team for critical alerts.

## Deployment safety

SLO changes should be shipped with blue-green deployment. Promote the green slot only after canary traffic remains below warning thresholds and P99 latency is below 100ms for the canary analysis period. Roll back immediately if any critical burn-rate alert fires.
