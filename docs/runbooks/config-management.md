# Configuration Management Runbook

## Validate a configuration change

1. Confirm the target service has a schema in `DEFAULT_CONFIG_SCHEMAS`.
2. Apply the candidate snapshot through the hot-reload path.
3. Verify the reload is accepted and the follow-up audit reports no critical findings.
4. Watch the operations dashboard for audit duration and canary status.

## Respond to rejected hot reload

1. Treat rejected reloads as failed changes; the prior accepted version remains active.
2. Inspect schema findings for missing fields, invalid types, allowlist failures, or out-of-bounds values.
3. Fix the candidate config and rerun validation.
4. If rejection repeats for production traffic, freeze rollout and perform security review.

## Canary rollback criteria

Rollback immediately when any of the following occur:

- Critical drift is reported for a canary sample.
- Canary analysis returns `promote=false` because drift-rate gates are exceeded.
- Audit duration exceeds the 100ms budget on critical paths.
- Deployment channel or release slot fails schema validation.

## Security review checklist

- Secrets and credentials are never added to baselines or dashboard output.
- Deployment channels are allowlisted.
- Numeric rollout controls have explicit min/max bounds.
- Critical service endpoints use HTTPS-only patterns.
