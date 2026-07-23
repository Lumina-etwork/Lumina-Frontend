import assert from "node:assert/strict"
import {
  formatAprBps,
  estimateRewards,
  computeAprEstimate,
  getCooldownEnd,
  getCooldownRemaining,
  isCooldownComplete,
  formatCooldownTime,
} from "../stakingCalculator"
import type { UnstakeRequest } from "../types"

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

function makeRequest(overrides: Partial<UnstakeRequest> = {}): UnstakeRequest {
  const now = Date.now()
  return {
    amount: 500_000_000_000n,
    walletAddress: "GABCDEF123",
    requestedAt: now,
    cooldownEndsAt: now + 21 * 86_400_000,
    status: "pending",
    ...overrides,
  }
}

async function runCalculatorTests() {
  console.log("\n  APR formatting tests")

  await test("formatAprBps returns whole percent when no fraction", async () => {
    assert.equal(formatAprBps(1200), "12.00%")
  })

  await test("formatAprBps returns fractional percent", async () => {
    assert.equal(formatAprBps(1250), "12.50%")
  })

  await test("formatAprBps handles zero", async () => {
    assert.equal(formatAprBps(0), "0.00%")
  })

  await test("formatAprBps handles single digit bps", async () => {
    assert.equal(formatAprBps(5), "0.05%")
  })
}

async function runEstimateTests() {
  console.log("\n  reward estimation tests")

  await test("estimateRewards computes correctly for 1 month at 12% APR", async () => {
    const amount = 1_000_000_000_000n
    const rewards = estimateRewards(amount, 1200, 1)
    const expected = (amount * 1200n) / (10_000n * 12n)
    assert.equal(rewards, expected)
  })

  await test("estimateRewards returns zero for zero amount", async () => {
    assert.equal(estimateRewards(0n, 1200, 6), 0n)
  })

  await test("estimateRewards returns zero for zero duration", async () => {
    assert.equal(estimateRewards(1_000_000_000_000n, 1200, 0), 0n)
  })

  await test("estimateRewards scales proportionally with duration", async () => {
    const r1 = estimateRewards(1_000_000_000_000n, 1200, 6)
    const r2 = estimateRewards(1_000_000_000_000n, 1200, 12)
    assert.equal(r2, r1 * 2n)
  })

  await test("computeAprEstimate returns full AprEstimate object", async () => {
    const result = computeAprEstimate(1_000_000_000_000n, 6, 1500)
    assert.equal(result.amount, 1_000_000_000_000n)
    assert.equal(result.durationMonths, 6)
    assert.equal(result.aprBps, 1500)
    assert.ok(result.estimatedRewards > 0n)
    assert.equal(result.totalAtMaturity, result.amount + result.estimatedRewards)
  })
}

async function runCooldownTests() {
  console.log("\n  cooldown logic tests")

  await test("getCooldownEnd returns correct timestamp", async () => {
    const requestedAt = 1_000_000_000_000
    const end = getCooldownEnd(requestedAt)
    assert.equal(end, requestedAt + 21 * 86_400_000)
  })

  await test("getCooldownRemaining returns zero for claimed request", async () => {
    const req = makeRequest({ status: "claimed", cooldownEndsAt: Date.now() + 100_000 })
    assert.equal(getCooldownRemaining(req), 0)
  })

  await test("getCooldownRemaining returns zero when cooldown ended", async () => {
    const req = makeRequest({ cooldownEndsAt: Date.now() - 1 })
    assert.equal(getCooldownRemaining(req), 0)
  })

  await test("getCooldownRemaining returns positive when cooldown active", async () => {
    const future = Date.now() + 86_400_000
    const req = makeRequest({ cooldownEndsAt: future })
    const remaining = getCooldownRemaining(req)
    assert.ok(remaining > 0)
    assert.ok(remaining <= 86_400_000)
  })

  await test("isCooldownComplete returns true for past cooldown", async () => {
    const req = makeRequest({ cooldownEndsAt: Date.now() - 1 })
    assert.equal(isCooldownComplete(req), true)
  })

  await test("isCooldownComplete returns false for active cooldown", async () => {
    const req = makeRequest({ cooldownEndsAt: Date.now() + 86_400_000 })
    assert.equal(isCooldownComplete(req), false)
  })

  await test("isCooldownComplete returns true for claimed request", async () => {
    const req = makeRequest({ status: "claimed", cooldownEndsAt: Date.now() + 100_000 })
    assert.equal(isCooldownComplete(req), true)
  })
}

async function runFormattingTests() {
  console.log("\n  cooldown formatting tests")

  await test("formatCooldownTime returns ready for zero", async () => {
    assert.equal(formatCooldownTime(0), "Ready to claim")
  })

  await test("formatCooldownTime returns ready for negative", async () => {
    assert.equal(formatCooldownTime(-1000), "Ready to claim")
  })

  await test("formatCooldownTime formats days hours minutes seconds", async () => {
    const ms = 2 * 86_400_000 + 3 * 3600_000 + 15 * 60_000 + 30_000
    const formatted = formatCooldownTime(ms)
    assert.ok(formatted.includes("2d"))
    assert.ok(formatted.includes("3h"))
    assert.ok(formatted.includes("15m"))
    assert.ok(formatted.includes("30s"))
  })

  await test("formatCooldownTime handles just seconds", async () => {
    const formatted = formatCooldownTime(45_000)
    assert.equal(formatted, "45s")
  })
}

async function run() {
  console.log("\nStaking Calculator — unit tests\n")
  await runCalculatorTests()
  await runEstimateTests()
  await runCooldownTests()
  await runFormattingTests()

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
    console.log("\n\u2705 All staking calculator tests passed.\n")
  }
}

run()
