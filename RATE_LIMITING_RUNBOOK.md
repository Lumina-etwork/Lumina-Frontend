# Rate Limiting Runbook

## Symptoms

- Elevated `429 Too Many Requests` responses for one or more tenants.
- Increased `rate_limit_check_duration_ms` latency.
- `rate_limit_store_errors_total` increments or limiter health checks fail.

## Triage

1. Confirm whether denials are isolated to a single tenant or system-wide.
2. Check the rate-limit dashboard for allow/deny rate, top denied tenants, and limiter latency percentiles.
3. Review recent tenant policy changes and deployment events.
4. Verify the backing store health, replication lag, and Lua/script execution errors.

## Mitigation

- For abusive traffic, keep enforcement enabled and notify the tenant owner with observed request rates and retry guidance.
- For incorrect policy rollout, switch the policy version back to the last known-good configuration.
- For backing-store brownouts, use the endpoint risk matrix: fail open only for low-risk read-only traffic and fail closed for write, admin, and payment operations.
- For latency regressions, roll back the canary or route traffic back to the green environment.

## Recovery validation

- `rate_limit_check_duration_ms` returns below 50ms P95.
- Store error rate remains below 0.1% for 15 minutes.
- Tenant-level 429 rates match expected policy thresholds.
- No security alerts are open for spoofed tenant identity or unaudited policy changes.
