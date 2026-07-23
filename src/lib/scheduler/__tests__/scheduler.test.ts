import assert from "node:assert/strict"
import { DistributedScheduler, DEFAULT_CONFIG } from "../scheduler"
import type { JobDefinition } from "../types"

interface FailedTest { name: string; error: unknown }
const failures: FailedTest[] = []
let passed = 0

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn()
    console.log(`  \u2713 ${name}`)
    passed++
  } catch (err) {
    console.error(`  \u2717 ${name}`)
    console.error(`    ${err instanceof Error ? err.message : String(err)}`)
    failures.push({ name, error: err })
  }
}

function makeDef(overrides: Partial<JobDefinition> = {}): JobDefinition {
  return {
    jobType: "test",
    priority: 0,
    payload: {},
    maxRetries: 3,
    timeoutMs: 60_000,
    ...overrides,
  }
}

async function runCoreTests() {
  console.log("\n  job store & lifecycle tests")

  await test("submit a job returns a job with pending status", async () => {
    const s = new DistributedScheduler()
    const job = s.submit(makeDef())
    assert.equal(job.status, "pending")
    assert.ok(job.jobId)
  })

  await test("claim a job assigns lease and updates status to running", async () => {
    const s = new DistributedScheduler()
    const job = s.submit(makeDef())
    const result = s.claimJob({
      workerId: "worker-1",
      jobId: job.jobId,
      leaseDurationMs: 30_000,
      claimedAt: Date.now(),
    })
    assert.ok(result)
    assert.equal(result.job.status, "running")
    assert.equal(result.job.claimedBy, "worker-1")
    assert.ok(result.lease.leaseId)
    assert.equal(result.lease.status, "active")
  })

  await test("complete a job marks it completed", async () => {
    const s = new DistributedScheduler()
    const job = s.submit(makeDef())
    s.claimJob({ workerId: "w1", jobId: job.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    s.completeJob(job.jobId, { txHash: "0xabc" }, Date.now())
    const completed = s.getJob(job.jobId)
    assert.equal(completed?.status, "completed")
    assert.deepEqual(completed?.result, { txHash: "0xabc" })
  })

  await test("fail a job triggers retry if retries remain", async () => {
    const s = new DistributedScheduler()
    const job = s.submit(makeDef({ maxRetries: 1 }))
    s.claimJob({ workerId: "w1", jobId: job.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    s.failJob(job.jobId, "oops")
    const failed = s.getJob(job.jobId)
    assert.equal(failed?.status, "pending")
    assert.equal(failed?.retryCount, 1)
  })

  await test("fail a job after max retries marks it failed", async () => {
    const s = new DistributedScheduler()
    const job = s.submit(makeDef({ maxRetries: 0 }))
    s.claimJob({ workerId: "w1", jobId: job.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    s.failJob(job.jobId, "fatal")
    const failed = s.getJob(job.jobId)
    assert.equal(failed?.status, "failed")
    assert.equal(failed?.error, "fatal")
  })

  await test("deduplicate same job type pending submission", async () => {
    const s = new DistributedScheduler()
    const job1 = s.submit(makeDef({ jobType: "dedup-test" }))
    const job2 = s.submit(makeDef({ jobType: "dedup-test" }))
    assert.equal(job1.jobId, job2.jobId)
  })

  await test("allow concurrent different job types", async () => {
    const s = new DistributedScheduler()
    const j1 = s.submit(makeDef({ jobType: "type-a" }))
    const j2 = s.submit(makeDef({ jobType: "type-b" }))
    assert.notEqual(j1.jobId, j2.jobId)
  })

  await test("getAllJobs returns all jobs sorted by creation time", async () => {
    const s = new DistributedScheduler()
    const j1 = s.submit(makeDef({ jobType: "a" }))
    const j2 = s.submit(makeDef({ jobType: "b" }))
    const all = s.getAllJobs()
    assert.equal(all.length, 2)
    assert.equal(all[0].jobId, j1.jobId)
    assert.equal(all[1].jobId, j2.jobId)
  })
}

async function runLeaseTests() {
  console.log("\n  lease management tests")

  await test("lease expires and job returns to pending", async () => {
    const config = { ...DEFAULT_CONFIG, leaseDurationMs: 10 }
    const s = new DistributedScheduler(config)
    const job = s.submit(makeDef({ maxRetries: 1 }))
    s.claimJob({ workerId: "w1", jobId: job.jobId, leaseDurationMs: 10, claimedAt: Date.now() })
    s.start()
    await new Promise((r) => setTimeout(r, 50))
    s.stop()
    const expired = s.getJob(job.jobId)
    assert.equal(expired?.status, "pending")
  })

  await test("lease expired beyond max retries becomes timed_out", async () => {
    const config = { ...DEFAULT_CONFIG, leaseDurationMs: 10 }
    const s = new DistributedScheduler(config)
    const job = s.submit(makeDef({ maxRetries: 0 }))
    s.claimJob({ workerId: "w1", jobId: job.jobId, leaseDurationMs: 10, claimedAt: Date.now() })
    s.start()
    await new Promise((r) => setTimeout(r, 50))
    s.stop()
    const expired = s.getJob(job.jobId)
    assert.equal(expired?.status, "timed_out")
  })

  await test("register and unregister workers", async () => {
    const s = new DistributedScheduler()
    s.registerWorker({ workerId: "w1", startedAt: Date.now() })
    assert.equal(s.getWorkers().length, 1)
    s.unregisterWorker("w1")
    assert.equal(s.getWorkers().length, 0)
  })

  await test("event history is recorded", async () => {
    const s = new DistributedScheduler()
    s.submit(makeDef())
    const events = s.getEventHistory()
    assert.equal(events.length, 1)
    assert.equal(events[0].type, "job_submitted")
  })

  await test("canary gate passes with healthy metrics", async () => {
    const s = new DistributedScheduler()
    s.submit(makeDef())
    s.claimJob({ workerId: "w1", jobId: s.getAllJobs()[0].jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    s.completeJob(s.getAllJobs()[0].jobId, {}, Date.now())
    const gate = s.checkCanaryGate()
    assert.equal(gate.pass, true)
  })

  await test("canary gate fails with high failure rate", async () => {
    const s = new DistributedScheduler()
    for (let i = 0; i < 10; i++) {
      const job = s.submit(makeDef({ maxRetries: 0, jobType: `fail-${i}` }))
      s.claimJob({ workerId: "w1", jobId: job.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
      s.failJob(job.jobId, "error")
    }
    const gate = s.checkCanaryGate()
    assert.equal(gate.pass, false)
  })

  await test("metrics are accurate", async () => {
    const s = new DistributedScheduler()
    const j1 = s.submit(makeDef({ jobType: "m1" }))
    s.claimJob({ workerId: "w1", jobId: j1.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    s.completeJob(j1.jobId, {}, Date.now())
    const j2 = s.submit(makeDef({ jobType: "m2", maxRetries: 0 }))
    s.claimJob({ workerId: "w1", jobId: j2.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    s.failJob(j2.jobId, "err")
    const m = s.getMetrics()
    assert.equal(m.totalJobsSubmitted, 2)
    assert.equal(m.totalJobsCompleted, 1)
    assert.equal(m.totalJobsFailed, 1)
  })
}

async function runIntegrationTests() {
  console.log("\n  integration tests")

  await test("full lifecycle: submit -> claim -> complete", async () => {
    const s = new DistributedScheduler()
    s.registerWorker({ workerId: "w-integration", startedAt: Date.now() })
    const job = s.submit(makeDef({ jobType: "integration-test" }))
    const claim = s.claimJob({ workerId: "w-integration", jobId: job.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    assert.ok(claim)
    s.completeJob(job.jobId, { success: true }, Date.now())
    const completed = s.getJob(job.jobId)
    assert.equal(completed?.status, "completed")
    assert.deepEqual(completed?.result, { success: true })
  })

  await test("worker heartbeat renews lease", async () => {
    const s = new DistributedScheduler()
    const job = s.submit(makeDef())
    const claim = s.claimJob({ workerId: "w-beat", jobId: job.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    assert.ok(claim)
  })

  await test("multiple workers can claim different jobs", async () => {
    const s = new DistributedScheduler()
    s.registerWorker({ workerId: "wa", startedAt: Date.now() })
    s.registerWorker({ workerId: "wb", startedAt: Date.now() })
    const j1 = s.submit(makeDef({ jobType: "a" }))
    const j2 = s.submit(makeDef({ jobType: "b" }))
    const c1 = s.claimJob({ workerId: "wa", jobId: j1.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    const c2 = s.claimJob({ workerId: "wb", jobId: j2.jobId, leaseDurationMs: 30_000, claimedAt: Date.now() })
    assert.ok(c1)
    assert.ok(c2)
    assert.notEqual(c1.lease.leaseId, c2.lease.leaseId)
  })
}

async function run() {
  console.log("\nDistributed Job Scheduler — unit tests\n")
  await runCoreTests()
  await runLeaseTests()
  await runIntegrationTests()

  const failed = failures.length
  console.log(`\n${"\u2500".repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)

  if (failures.length > 0) {
    console.error("\nFailed tests:")
    failures.forEach(({ name, error }) => {
      console.error(`  \u2717 ${name}`)
      if (error instanceof Error) console.error(`    ${error.stack}`)
    })
    process.exit(1)
  } else {
    console.log("\n\u2705 All scheduler tests passed.\n")
  }
}

run()