# Structured Logging Runbook

Lumina emits JSON log records shaped to OpenTelemetry log semantic conventions for telemetry API ingestion paths.

## Architecture

- `src/lib/logging/otelLogger.ts` is the shared logging factory.
- Each record includes `timestamp`, `severity_text`, `severity_number`, `body`, `resource`, and `attributes` fields.
- Resource attributes include `service.name`, `service.version` when provided, and `deployment.environment.name`.
- Telemetry API routes log domain events such as `stellar.error.unknown`, `dependency.vulnerability.scan`, `config.drift.detected`, and `backup_restore.event`.

## Security

The logger redacts attribute keys that look like credentials, including tokens, API keys, cookies, private keys, seeds, mnemonics, and passwords. Payload-producing code should still avoid sending raw secrets.

## Monitoring and Alerting

Recommended alerts:

- Error-rate alert: page when `severity_text=ERROR` exceeds the service SLO burn rate.
- Latency alert: page when `duration.ms` P99 exceeds 100 ms on critical telemetry paths.
- Security alert: page on critical vulnerability or config drift counts greater than zero.

Recommended dashboard panels:

- Logs by `body` and `severity_text`.
- P50/P95/P99 `duration.ms` grouped by `service.name`.
- Security finding counts by event type.
- Offline telemetry queue depth and retry outcomes.

## Deployment

Use the existing blue-green deployment flow. Send canary traffic to the new version and compare structured log volume, parse errors, error rate, and `duration.ms` P99 before promotion.

## Verification

1. Run `pnpm test:logging` or `pnpm exec tsx src/lib/logging/__tests__/otelLogger.test.ts`.
2. POST a sample payload to each `/api/telemetry/*` route.
3. Confirm log pipeline parses JSON records and indexes `resource.service.name`, `severity_text`, and `body`.
