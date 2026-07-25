# Dead Letter Queue Architecture

## Overview

Lumina's scheduler now isolates poison messages in a bounded in-memory Dead Letter Queue (DLQ) after retries or lease timeouts are exhausted. The DLQ protects critical scheduling paths by keeping failed work out of the normal pending queue while preserving enough context for operator inspection, replay, and audit.

## Message lifecycle

1. Jobs enter the scheduler with `pending` status.
2. Workers claim jobs and process them under a lease.
3. Transient failures retry until `maxRetries` is exhausted.
4. Final failures are marked `dead_lettered` and copied into the DLQ with:
   - immutable job snapshot,
   - failure reason,
   - final error message,
   - retry count,
   - failure timestamp.
5. Operators can inspect DLQ entries and explicitly requeue an entry after fixing the underlying issue.

## Failure reasons

- `max_retries_exceeded`: worker processing failed beyond the configured retry limit.
- `lease_expired`: the job exhausted retry attempts due to stale or expired worker leases.
- `manual`: reserved for operator-initiated quarantine workflows.

## Performance and availability

The implementation uses O(1) lookup/removal for entries and caps retention with `deadLetterRetentionCount` to avoid unbounded memory growth. The default cap is 1,000 entries. DLQ writes happen only on terminal failures, keeping the normal claim/complete path under the existing 100ms P99 budget.

## Monitoring and alerting

The scheduler emits these events for dashboards and alert routing:

- `job_dead_lettered` with `entryId`, `reason`, and `error` metadata.
- `job_requeued_from_dead_letter` with the source `entryId`.

Scheduler metrics include `deadLetteredJobs`; alert when the count increases within a short window or when the DLQ depth remains non-zero for longer than the incident response SLA.

## Deployment

Roll out via the existing blue-green/canary gate. During canary, verify:

- p99 processing latency remains below `performanceBudgetMs`.
- failure rate remains below 5%.
- DLQ events are visible in telemetry.
- requeue operations preserve the original job identity.
