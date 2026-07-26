# Capacity Planning with Historical Usage Trending

## Goals

- Surface system-wide capacity risk from historical API usage trends.
- Keep dashboard calculations deterministic and fast enough for interactive paths.
- Provide recommendations that operations can connect to autoscaling, alerting, and deployment gates.

## Architecture

1. **Telemetry ingestion** collects request volume, provisioned capacity, error counts, and latency percentiles per service/API key.
2. **Trend analysis** orders historical samples, computes average positive growth, projects future utilization, and identifies time-to-saturation.
3. **Recommendation layer** labels plans as `stable`, `watch`, or `scale` based on current and forecast utilization thresholds.
4. **Dashboard presentation** shows utilization, historical growth, saturation risk, recommended capacity, and a forward-looking chart.

The current frontend uses mocked dashboard data while preserving a pure `calculateCapacityPlan` API that can be wired to backend telemetry without changing the rendering contract.

## Operational thresholds

- Watch threshold: 70% projected utilization.
- Scale threshold: 85% current or projected utilization.
- Safety headroom: recommended capacity includes 20% over the forecasted peak.

## Deployment and monitoring notes

- Deploy the telemetry-backed endpoint behind a feature flag and release with blue-green plus canary analysis.
- Alert when the `scale` recommendation persists for two consecutive evaluation windows or any critical path P99 exceeds 100ms.
- Add dashboard panels for service-level forecast utilization, days to saturation, and recommendation state.
- Update runbooks with remediation steps: add capacity, shed non-critical traffic, validate error budgets, and rollback recent changes if growth is anomalous.
