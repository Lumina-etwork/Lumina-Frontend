# Incident Response Runbook Automation with PagerDuty Integration

## Architecture

Lumina incident automation converts service health signals into PagerDuty Events API v2 trigger payloads and attaches the matching runbook metadata before notification. The flow is:

1. SLO monitors, synthetic checks, and application alerts emit an `IncidentSignal` with service, severity, summary, source, timestamp, and relevant metrics.
2. `selectRunbook` maps the signal service to the system runbook registry. Unknown services fall back to the API critical-path runbook while preserving the original service name for triage.
3. `buildPagerDutyTrigger` creates a deterministic dedupe key, adds escalation policy metadata, links the Grafana dashboard, and exposes automation actions for the responder.
4. The delivery worker posts the payload to PagerDuty with a secret routing key stored outside source control.

## Operational Targets

- Critical-path payload construction is synchronous and allocation-light so it can remain below the 100ms P99 target.
- PagerDuty delivery workers must be deployed active-active across regions to support the 99.99% uptime target.
- Destructive or traffic-shifting automation actions are marked `requiresApproval` and must be gated by human approval during security review.

## Monitoring and Alerting

Track the following metrics for dashboards and canary analysis:

- `incident_payload_build_duration_ms` with P50/P95/P99 panels and a 100ms P99 alert.
- `pagerduty_events_api_success_total` and `pagerduty_events_api_failure_total` by service and severity.
- `incident_runbook_selected_total` by runbook id to detect unmapped or noisy services.
- `incident_automation_action_requested_total` and `incident_automation_action_approved_total` for auditability.

## Blue-Green Deployment and Canary Analysis

1. Deploy the delivery worker to the green environment with PagerDuty routing in shadow mode.
2. Replay the previous 24 hours of non-sensitive alert envelopes and compare dedupe keys, runbook ids, and action metadata against blue.
3. Shift 5% of real trigger traffic to green for 30 minutes; roll back if Events API failures exceed 0.1% or P99 build latency exceeds 100ms.
4. Promote green only after security approval confirms routing keys, logs, and custom details do not expose secrets or regulated data.

## Responder Runbook

1. Open the PagerDuty incident and verify the linked dashboard matches the impacted service.
2. Review `custom_details.runbookId`, metric context, and automated action recommendations.
3. Execute read-only actions first. Approval-gated actions require incident commander approval in the incident timeline.
4. If mitigation requires rollback or blue-green promotion, run the documented deployment action and monitor canary metrics for 30 minutes.
5. Close the incident only after SLO burn rate and PagerDuty event failure panels are healthy.
