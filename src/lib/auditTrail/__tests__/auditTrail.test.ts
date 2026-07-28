import assert from "node:assert/strict"
import { AuditTrail, calculateAuditHash, GENESIS_HASH } from "../index"

interface FailedTest { name: string; error: unknown }
const failures: FailedTest[] = []
let passed = 0

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err instanceof Error ? err.message : String(err)}`)
    failures.push({ name, error: err })
  }
}

function makeTrail(): AuditTrail {
  const trail = new AuditTrail()
  trail.append({ action: "vault.created", actorId: "user-1", resource: "vault-1", timestamp: "2026-07-25T00:00:00.000Z" })
  trail.append({ action: "vault.approved", actorId: "approver-1", resource: "vault-1", severity: "critical", timestamp: "2026-07-25T00:01:00.000Z", metadata: { approvalId: "approval-1" } })
  return trail
}

async function runAuditTrailTests() {
  console.log("\n  audit trail hash chain tests")

  await test("appends entries with deterministic genesis and previous hashes", () => {
    const trail = makeTrail()
    const [first, second] = trail.getEntries()
    assert.equal(first.previousHash, GENESIS_HASH)
    assert.equal(second.previousHash, first.hash)
    assert.equal(
      first.hash,
      calculateAuditHash({
        action: first.action,
        actorId: first.actorId,
        metadata: first.metadata,
        previousHash: first.previousHash,
        resource: first.resource,
        sequence: first.sequence,
        severity: first.severity,
        timestamp: first.timestamp,
      }),
    )
  })

  await test("verifies an intact hash chain", () => {
    const report = makeTrail().verify()
    assert.equal(report.valid, true)
    assert.equal(report.checkedEntries, 2)
    assert.equal(report.failures.length, 0)
  })

  await test("detects payload tampering", () => {
    const trail = makeTrail()
    const entries = trail.getEntries()
    entries[1] = { ...entries[1], actorId: "attacker" }
    const report = trail.verify(entries)
    assert.equal(report.valid, false)
    assert.equal(report.failures[0].reason, "hash_mismatch")
  })

  await test("detects broken previous hash links", () => {
    const trail = makeTrail()
    const entries = trail.getEntries()
    entries[1] = { ...entries[1], previousHash: GENESIS_HASH }
    const report = trail.verify(entries)
    assert.equal(report.valid, false)
    assert.ok(report.failures.some((failure) => failure.reason === "previous_hash_mismatch"))
  })

  await test("publishes monitoring metrics for dashboards and alerts", () => {
    const trail = makeTrail()
    trail.verify()
    const metrics = trail.getMetrics()
    assert.equal(metrics.totalEntries, 2)
    assert.equal(metrics.criticalEntries, 1)
    assert.equal(metrics.verificationFailures, 0)
    assert.ok(metrics.lastVerifiedAt)
  })
}

runAuditTrailTests().then(() => {
  console.log(`\nAudit trail tests: ${passed} passed, ${failures.length} failed`)
  if (failures.length > 0) process.exit(1)
})
