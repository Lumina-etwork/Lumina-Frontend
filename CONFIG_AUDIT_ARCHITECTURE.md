# Runtime Configuration Auditing and Drift Detection

## Overview

Lumina Frontend now includes a system-wide runtime configuration auditor that:

- captures live configuration from registered services,
- diffs each snapshot against a versioned baseline,
- emits redacted drift findings to operators and telemetry,
- enforces a **&lt;100ms P99** budget on critical audit paths,
- supports **blue-green** release slots and **canary** promotion analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Config sources (Soroban RPC, API client, deployment, mesh) │
└────────────────────────────┬────────────────────────────────┘
                             │ capture()
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ConfigAuditor (src/services/configAudit.ts)                │
│  - auditService / auditAll                                  │
│  - history ring + subscribers                               │
│  - canary promotion gate                                    │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│  Diff engine             │    │  Telemetry + dashboard      │
│  src/lib/config/diff.ts  │    │  /api/telemetry/config-drift│
│  baseline + redact       │    │  /dashboard/config-audit    │
└──────────────────────────┘    └─────────────────────────────┘
```

## Components

| Path | Role |
|------|------|
| `src/lib/config/types.ts` | Shared types, performance budget, sensitive path fragments |
| `src/lib/config/baseline.ts` | Versioned expected state per service |
| `src/lib/config/diff.ts` | Flatten + compare engine |
| `src/lib/config/redact.ts` | Secret redaction before logs / alerts |
| `src/lib/config/canary.ts` | Blue-green / canary promotion analysis |
| `src/services/configAudit.ts` | Orchestrator, registry, history, singleton |
| `src/hooks/useConfigAudit.ts` | React subscription + periodic audits |
| `src/components/providers/ConfigAuditBridge.tsx` | App-wide wiring (live Soroban capture) |
| `src/components/dashboard/ConfigAuditDashboard.tsx` | Operator dashboard |
| `src/app/api/telemetry/config-drift/route.ts` | Monitoring ingest endpoint |

## Performance

- Critical path: `auditService` / `auditAll` (sync capture + diff).
- Budget: `PERFORMANCE_BUDGET_MS = 100`.
- Each report includes `metrics.durationMs` and `metrics.withinBudget`.
- Audits must not perform network I/O on the critical path; telemetry is async and fire-and-forget.

## Security

- Sensitive path fragments (`apiKey`, `token`, `privateKey`, …) are redacted to `[REDACTED]` in findings.
- Empty / null secrets are left unchanged so absence vs presence remains visible without leaking values.
- Telemetry payloads are expected to be pre-redacted; the ingest route never persists raw secrets.

## Availability

- Auditor failures (missing source, capture exceptions) produce critical findings instead of throwing.
- Telemetry errors are swallowed / queued offline so drift detection does not take down the UI (99.99% availability target for the audit path).

## Deployment Channels

Runtime channel is read from:

- `NEXT_PUBLIC_DEPLOY_CHANNEL` — `stable` \| `blue` \| `green` \| `canary`
- `NEXT_PUBLIC_RELEASE_SLOT` — active slot (`blue` / `green`)
- `NEXT_PUBLIC_CANARY_PERCENT` — traffic share for canary analysis

See `CONFIG_AUDIT_RUNBOOK.md` for promotion and rollback procedures.
