# Database Migration Versioning with Rollback Support

## Goals

- Version every client-side database schema/data change with a monotonic integer version.
- Keep critical migration orchestration under the 100ms P99 budget for normal paths; expensive backfills must run outside request/render paths.
- Provide deterministic rollback through `down` migrations and pre-migration snapshots.
- Emit telemetry that can feed deployment gates, alerting, and dashboards.

## Architecture

| Layer | Responsibility |
| --- | --- |
| Migration definitions | Declare `version`, `name`, `description`, `up`, and `down` handlers. |
| `MigrationManager` | Sorts migrations, rejects duplicates, applies version ranges, captures rollback snapshots, records checksums/status, and emits telemetry. |
| Storage adapter | Persists records/snapshots to the relevant database or service metadata store. The core manager is storage-agnostic so services can use IndexedDB, SQL, or API-backed stores. |
| Observability | Ships `migration_*` telemetry events to monitoring and alerts on failures or SLO warnings. |
| Deployment gate | Blocks promotion when migration tests fail, security review is incomplete, or canary telemetry reports errors. |

## Rollback Strategy

1. Before each `up` migration, capture a pre-migration snapshot.
2. If `up` fails, restore the snapshot for that migration and stop the run.
3. For operator-triggered rollback, execute `down` migrations in descending version order until the target version is reached.
4. Keep the previous blue-green slot warm until canary analysis confirms the new migration version is healthy.

## Monitoring and Alerts

- Track migration duration, status, version, and checksum from `MigrationTelemetryEvent`.
- Page on any `migration_failed` event in production.
- Warn on `migration_slo_warning` when a migration exceeds the 100ms critical path budget.
- Dashboard panels should include current version by service, failed migrations by release slot, P95/P99 duration, and rollback counts.

## Security Review Checklist

- Verify migrations do not log secrets or PII in errors/telemetry.
- Require checksum review for changed migration definitions.
- Confirm rollback snapshots inherit the same encryption/access controls as production data.
- Validate least-privilege database credentials for service-side adapters.
