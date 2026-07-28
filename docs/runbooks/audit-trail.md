# Audit Trail Runbook

## Verification failure response

1. Freeze destructive audit retention jobs and preserve the current audit store snapshot.
2. Run hash-chain verification against the affected partition and record the first failing sequence.
3. Compare the failing event with upstream service logs and immutable backups.
4. Escalate critical or confirmed tampering to security review before remediation.
5. Rebuild read models only after the canonical audit source has been validated.

## SLO response

- Latency: page the owning service if audit append p99 is above 100 ms for five minutes.
- Availability: fail open only for non-critical analytics events; critical security and vault lifecycle events must preserve audit writes or block the operation.
- Canary: stop promotion when any canary verification failure is detected.
