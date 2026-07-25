# Configuration Management Architecture

Lumina uses a process-wide `ConfigAuditor` to keep runtime service configuration in sync with declared baselines and service schemas. The architecture has four layers:

1. **Sources** register live configuration snapshots per service.
2. **Schemas** validate shape, type, required fields, allowlists, and numeric bounds before a value can be trusted.
3. **Baselines** compare validated snapshots against expected values and classify drift as critical, warning, or info.
4. **Operations surfaces** expose audit history, performance budget status, canary promotion decisions, and telemetry hooks.

The auditor is synchronous by design so UI-critical checks remain below the 100ms P99 target. Hot-reload callers should validate candidate snapshots with the service schema first, then atomically replace the registered source and run a follow-up audit. Critical schema failures reject the reload and increment rejected reload counters.

## Blue-green and canary flow

- Deploy configuration to the inactive blue or green slot.
- Start canary with `channel=canary` and a bounded `canaryPercent` between 0 and 100.
- Collect at least the minimum canary sample count from repeated audits.
- Promote only when critical drift and total drift rates are within gates.
- Roll back to the previous release slot when critical drift, schema rejection, or performance-budget violations appear.

## Monitoring and alerting

The dashboard and telemetry payload include audit duration, budget status, finding counts by severity, baseline version, channel, and canary decision. Alert rules should page on critical findings, rejected hot reloads, invalid deployment channels, and audit durations above 100ms.
