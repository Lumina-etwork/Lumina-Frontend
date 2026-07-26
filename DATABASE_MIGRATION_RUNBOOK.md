# Database Migration Runbook

## Pre-deployment

1. Run unit tests for migration ordering, failure rollback, and reverse rollback.
2. Review migration checksums and security-sensitive data handling.
3. Confirm dashboards are receiving `migration_started`, `migration_applied`, `migration_failed`, and `migration_rolled_back` events.
4. Prepare blue and green release slots with the previous slot kept warm.

## Deployment

1. Deploy the new version to the inactive slot.
2. Run migrations against canary traffic or a canary tenant first.
3. Watch P99 migration duration and failure rate for at least one canary window.
4. Promote traffic only when no `migration_failed` events occur and the 100ms critical-path budget is maintained.

## Rollback

1. Stop promotion and route traffic back to the previous slot.
2. Call the service migration runner with the known-good target version.
3. Confirm `migration_rolled_back` telemetry for each reversed version.
4. Validate application health checks, record counts, and user-facing critical paths.
5. Keep the incident open until snapshots are archived or securely expired.

## Post-deployment

- Update the migration inventory with applied versions and checksums.
- Attach telemetry screenshots or dashboard links to the release record.
- Document any SLO warnings and the follow-up owner.
