# Secret Rotation Service for Database Credentials and API Keys

## Architecture

The secret rotation service is modeled as a system-wide control plane that inventories database credentials and API keys, evaluates their rotation state, and emits deterministic rotation plans for operator approval. The frontend implementation keeps critical-path logic pure and synchronous so assessment remains below the 100ms P99 budget.

```text
Secret inventory -> Rotation policy engine -> Findings + plans -> Telemetry + dashboard
                         |                         |
                         v                         v
                  Canary weight              Blue-green phases
```

## Rotation flow

1. **Prepare**: create the next secret version in the external secret manager and validate dependent health checks.
2. **Canary**: route a bounded percentage of traffic to the new version and compare error rate, auth failures, and latency.
3. **Blue-green promotion**: promote the green deployment once the canary is healthy while keeping blue credentials available.
4. **Revoke old version**: disable the previous version after the grace window and write an audit record.

## Monitoring and alerting

- Dashboard: `/dashboard/secret-rotation` shows current status, due dates, severity counts, and planned rollout phases.
- Telemetry ingest: `POST /api/telemetry/secret-rotation` accepts redacted rotation reports.
- Alerts:
  - critical if any secret is overdue or failed,
  - warning if a secret is due within its rotation window,
  - warning if assessment duration exceeds 100ms.

## Security review checklist

- [ ] No plaintext secret values are displayed in the dashboard.
- [ ] Telemetry redacts secret, token, password, credential, and apiKey fields.
- [ ] Rotation plans use canary plus blue-green deployment with rollback to the previous version.
- [ ] Old versions are revoked only after grace-period audit confirmation.
