# API Rate Limiting with Per-Tenant Token Buckets

## Goals

- Enforce system-wide request fairness by assigning every authenticated tenant an independent token bucket.
- Keep critical-path overhead below 100ms P99 by making rate-limit checks an O(1) operation backed by local memory in the frontend simulation and Redis or an equivalent atomic counter store in production services.
- Preserve 99.99% availability by failing closed for abusive tenants and failing open only for explicitly classified read-only low-risk endpoints during limiter store brownouts.

## Request flow

1. Resolve the tenant from the authenticated API key, session, or service credential.
2. Load the tenant policy: `capacity`, `refillTokensPerSecond`, and optional `burstCapacity`.
3. Evaluate the token bucket before dispatching downstream work.
4. Return `429 Too Many Requests` with `Retry-After`, remaining quota, and reset metadata when a tenant is over quota.
5. Emit structured metrics for allow, deny, latency, policy version, and store errors.

## Core algorithm

The shared `TenantTokenBucketLimiter` maintains an isolated bucket per tenant. Each check refills tokens from elapsed time, caps the bucket at `burstCapacity`, and atomically deducts the request cost when enough tokens are available. Production services should run the same state transition in a Redis Lua script or strongly consistent edge KV primitive to prevent concurrent over-admission.

## Monitoring and alerting

- Metrics: `rate_limit_allowed_total`, `rate_limit_denied_total`, `rate_limit_check_duration_ms`, `rate_limit_store_errors_total`, and `tenant_policy_version`.
- Alerts: page when limiter checks exceed 50ms P95 for 5 minutes, when store errors exceed 0.1% of checks, or when a tenant is denied above 25% for 10 minutes.
- Dashboards: show global allow/deny rate, top denied tenants, limiter latency percentiles, and canary-vs-stable policy comparisons.

## Deployment plan

1. Ship in shadow mode and log would-deny decisions.
2. Enable enforcement for internal tenants in a blue-green deployment.
3. Canary 5% of production tenants and compare 429 rate, latency, and support tickets.
4. Ramp to 25%, 50%, and 100% after each window meets the error-budget and latency gates.
5. Roll back by switching policy mode to `shadow` or routing traffic to the previous green environment.

## Security considerations

- Tenant identity must come from verified authentication context, never from user-supplied headers alone.
- Rate-limit response metadata must not disclose other tenants or global capacity.
- Admin policy changes require audit logging and least-privilege access.
