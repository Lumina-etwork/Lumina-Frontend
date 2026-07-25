# Audit Trail with Tamper-Evident Hash Chain Verification

## Architecture

The audit trail is an append-only event stream. Every entry includes a monotonically increasing sequence number, a canonical JSON payload, the previous entry hash, and a SHA-256 hash over those fields. The first record links to a fixed genesis hash. Any mutation to an existing event, removal of an event, insertion gap, or reordered event changes the expected hash chain and is reported by verification.

## Critical path

1. Services emit audit events with actor, action, resource, timestamp, severity, and metadata.
2. The append path calculates the previous hash from the current head and writes the new entry.
3. Critical authorization and vault lifecycle actions should use synchronous append and target p99 latency below 100 ms.
4. Background verification replays the chain and emits dashboard metrics and alerts.

## Monitoring and alerting

Dashboards should chart total entries, critical entries, head hash, last verification time, verification failures, append p99 latency, and ingestion success rate. Alert when verification failures are non-zero, append p99 exceeds 100 ms for five minutes, or ingestion success rate drops below 99.99%.

## Deployment

Deploy schema-compatible readers first, then deploy writers with blue-green rollout. Enable canary traffic for a small service slice and compare head hashes, append latency, and verification failures before promoting. Roll back immediately if canary verification reports hash mismatches or broken previous-hash links.
