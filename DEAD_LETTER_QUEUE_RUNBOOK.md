# Dead Letter Queue Runbook

## Triage

1. Check scheduler metrics for `deadLetteredJobs` and current DLQ depth.
2. Inspect recent `job_dead_lettered` events and group by `reason` and `job.definition.jobType`.
3. Review the preserved error message and payload snapshot for malformed data, expired credentials, dependency outages, or code regressions.

## Remediation

1. Fix the upstream issue or deploy the corrected worker.
2. For each safe entry, call `requeueDeadLetter(entryId)` from the scheduler control plane.
3. Watch for `job_requeued_from_dead_letter` and a subsequent `job_completed` event.
4. If a message remains unsafe to replay, retain it for audit or remove it according to retention policy.

## Alerts

Page the on-call engineer when:

- DLQ depth is greater than zero for more than 15 minutes in production.
- More than five jobs are dead-lettered in five minutes.
- A single job type repeatedly dead-letters after requeue.

## Canary validation

Before shifting all traffic to a new deployment, confirm the canary gate passes and no unexpected DLQ growth occurs. Roll back if dead-letter rate spikes or p99 processing latency exceeds the configured 100ms budget.
