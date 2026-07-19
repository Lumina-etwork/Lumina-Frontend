# Config Audit Runbook

## Purpose

Operator procedures for runtime configuration drift detection, alerting, and blue-green / canary releases.

## Monitoring

| Signal | Source | Alert when |
|--------|--------|------------|
| Drift findings | `POST /api/telemetry/config-drift` + dashboard | `criticalCount > 0` |
| Audit latency | `metrics.durationMs` / `withinBudget` | P99 ≥ 100ms |
| Canary hold | `analyzeCanary()` reason | `promote === false` after min samples |

### Dashboard

Open `/dashboard/config-audit` to inspect:

- last audit status and duration,
- per-path drift table (service, path, severity, expected, actual),
- canary promote / hold recommendation.

### Log alerts

The telemetry route logs:

- `console.error` for critical drift,
- `console.warn` for warning-only drift,
- `console.info` otherwise.

Wire log drains (CloudWatch, Datadog, etc.) to these messages for paging.

## Triage

1. Open `/dashboard/config-audit` and click **Run audit**.
2. For each **critical** finding:
   - confirm whether the live value is intentional (emergency override) or accidental.
   - if accidental, restore the baseline value (RPC URL, passphrase, deploy channel).
3. For **warning** findings, schedule a baseline update or config fix within the next change window.
4. Confirm `withinBudget` is true; if not, reduce registered source work (no network in `capture()`).

## Blue-green deployment

1. Deploy the new build to the **inactive** slot (`NEXT_PUBLIC_RELEASE_SLOT=green` while blue serves traffic, or vice versa).
2. Set `NEXT_PUBLIC_DEPLOY_CHANNEL=green` (or `blue`) on the idle slot only.
3. Run audits against the idle slot; require `ok === true` and `withinBudget`.
4. Flip the edge router / CDN to the new slot (instant cutover).
5. Keep the previous slot warm for rapid rollback (swap traffic back if critical drift appears).

## Canary analysis

1. Set `NEXT_PUBLIC_DEPLOY_CHANNEL=canary` and `NEXT_PUBLIC_CANARY_PERCENT` (e.g. `5`).
2. Collect at least **3** audit samples (`CANARY_MIN_SAMPLES`).
3. Promotion requires:
   - critical drift rate = 0,
   - overall drift rate ≤ 5%.
4. If `promote === false`, halt expansion, fix config, and re-sample.
5. On success, promote canary → green → stable and set `NEXT_PUBLIC_CANARY_PERCENT=0`.

## Rollback

1. Point traffic to the previous blue/green slot.
2. Set `NEXT_PUBLIC_DEPLOY_CHANNEL=stable` on the serving slot.
3. Re-run audit; confirm no critical findings.
4. File an incident note with the redacted findings from the failed canary.

## Security review checklist

- [ ] No plaintext secrets in telemetry logs or dashboard cells (expect `[REDACTED]`).
- [ ] Baseline updates reviewed like code changes.
- [ ] Capture functions remain sync and free of outbound network calls.
- [ ] New services register both a `ConfigSource` and a `ServiceBaseline`.
