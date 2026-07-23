import assert from "node:assert/strict"
import { ApprovalStore } from "../approvalStore"
import type { Approval, ApprovalHistoryEntry, SpendingCap } from "../types"

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

function makeApproval(overrides: Partial<Approval> = {}): Approval {
  return {
    id: "approval-1",
    token: "USDC",
    dAppAddress: "0xdApp1",
    allowance: 1000n,
    currentSpent: 0n,
    createdAt: Date.now(),
    status: "active",
    isUnlimited: false,
    ...overrides,
  }
}

function makeCap(overrides: Partial<SpendingCap> = {}): SpendingCap {
  return {
    id: "cap-1",
    dAppAddress: "0xdApp1",
    period: "daily",
    limit: 5000n,
    spent: 0n,
    windowStart: Date.now(),
    lastUpdated: Date.now(),
    ...overrides,
  }
}

function makeHistory(overrides: Partial<ApprovalHistoryEntry> = {}): ApprovalHistoryEntry {
  return {
    id: "hist-1",
    approvalId: "approval-1",
    token: "USDC",
    dAppAddress: "0xdApp1",
    previousAllowance: 0n,
    newAllowance: 1000n,
    changeType: "approve",
    timestamp: Date.now(),
    ...overrides,
  }
}

async function runApprovalTests() {
  console.log("\n  approval crud tests")

  await test("add approval stores and retrieves it", async () => {
    const store = new ApprovalStore()
    store.addApproval(makeApproval())
    const retrieved = store.getApproval("approval-1")
    assert.ok(retrieved)
    assert.equal(retrieved.token, "USDC")
    assert.equal(retrieved.allowance, 1000n)
  })

  await test("update approval modifies fields", async () => {
    const store = new ApprovalStore()
    store.addApproval(makeApproval())
    const updated = store.updateApproval("approval-1", { allowance: 2000n })
    assert.ok(updated)
    assert.equal(updated.allowance, 2000n)
  })

  await test("update unknown approval returns undefined", async () => {
    const store = new ApprovalStore()
    const result = store.updateApproval("non-existent", { allowance: 100n })
    assert.equal(result, undefined)
  })

  await test("remove approval deletes it", async () => {
    const store = new ApprovalStore()
    store.addApproval(makeApproval())
    assert.ok(store.removeApproval("approval-1"))
    assert.equal(store.getApproval("approval-1"), undefined)
  })

  await test("remove unknown approval returns false", async () => {
    const store = new ApprovalStore()
    assert.equal(store.removeApproval("non-existent"), false)
  })

  await test("getApprovalsByDApp returns matching approvals", async () => {
    const store = new ApprovalStore()
    store.addApproval(makeApproval({ id: "a1", dAppAddress: "0xApp1" }))
    store.addApproval(makeApproval({ id: "a2", dAppAddress: "0xApp2" }))
    store.addApproval(makeApproval({ id: "a3", dAppAddress: "0xApp1" }))
    assert.equal(store.getApprovalsByDApp("0xApp1").length, 2)
    assert.equal(store.getApprovalsByDApp("0xApp2").length, 1)
  })

  await test("getApprovalsByStatus filters correctly", async () => {
    const store = new ApprovalStore()
    store.addApproval(makeApproval({ id: "a1", status: "active" }))
    store.addApproval(makeApproval({ id: "a2", status: "revoked" }))
    store.addApproval(makeApproval({ id: "a3", status: "active" }))
    assert.equal(store.getApprovalsByStatus("active").length, 2)
    assert.equal(store.getApprovalsByStatus("revoked").length, 1)
  })

  await test("revoke approval sets status to revoked and allowance to 0", async () => {
    const store = new ApprovalStore()
    store.addApproval(makeApproval({ id: "a1", allowance: 5000n }))
    const revoked = store.revokeApproval("a1")
    assert.ok(revoked)
    assert.equal(revoked.status, "revoked")
    assert.equal(revoked.allowance, 0n)
  })

  await test("getAllApprovals returns all entries", async () => {
    const store = new ApprovalStore()
    store.addApproval(makeApproval({ id: "a1" }))
    store.addApproval(makeApproval({ id: "a2" }))
    assert.equal(store.getAllApprovals().length, 2)
  })
}

async function runSpendingCapTests() {
  console.log("\n  spending cap tests")

  await test("add spending cap stores and retrieves it", async () => {
    const store = new ApprovalStore()
    store.addSpendingCap(makeCap())
    const cap = store.getSpendingCap("cap-1")
    assert.ok(cap)
    assert.equal(cap.period, "daily")
    assert.equal(cap.limit, 5000n)
  })

  await test("update spending cap modifies fields", async () => {
    const store = new ApprovalStore()
    store.addSpendingCap(makeCap())
    const updated = store.updateSpendingCap("cap-1", { limit: 10000n })
    assert.ok(updated)
    assert.equal(updated.limit, 10000n)
  })

  await test("remove spending cap deletes it", async () => {
    const store = new ApprovalStore()
    store.addSpendingCap(makeCap())
    assert.ok(store.removeSpendingCap("cap-1"))
    assert.equal(store.getSpendingCap("cap-1"), undefined)
  })

  await test("getSpendingCapsByDApp returns matching caps", async () => {
    const store = new ApprovalStore()
    store.addSpendingCap(makeCap({ id: "c1", dAppAddress: "0xApp1" }))
    store.addSpendingCap(makeCap({ id: "c2", dAppAddress: "0xApp2" }))
    store.addSpendingCap(makeCap({ id: "c3", dAppAddress: "0xApp1" }))
    assert.equal(store.getSpendingCapsByDApp("0xApp1").length, 2)
    assert.equal(store.getSpendingCapsByDApp("0xApp2").length, 1)
  })

  await test("checkSpendingCap passes when no caps exist", async () => {
    const store = new ApprovalStore()
    assert.ok(store.checkSpendingCap("0xunknown", 1000n))
  })

  await test("checkSpendingCap allows within limit", async () => {
    const store = new ApprovalStore()
    store.addSpendingCap(makeCap({ limit: 5000n, spent: 1000n }))
    assert.ok(store.checkSpendingCap("0xdApp1", 2000n))
  })

  await test("checkSpendingCap rejects exceeding limit", async () => {
    const store = new ApprovalStore()
    store.addSpendingCap(makeCap({ limit: 5000n, spent: 4000n }))
    assert.equal(store.checkSpendingCap("0xdApp1", 2000n), false)
  })

  await test("checkSpendingCap resets spent after window elapses", async () => {
    const store = new ApprovalStore()
    const oldWindow = Date.now() - 86_400_001
    store.addSpendingCap(makeCap({ limit: 5000n, spent: 5000n, windowStart: oldWindow }))
    assert.ok(store.checkSpendingCap("0xdApp1", 1000n))
  })

  await test("recordSpend increments spent", async () => {
    const store = new ApprovalStore()
    store.addSpendingCap(makeCap({ limit: 5000n, spent: 1000n }))
    store.recordSpend("0xdApp1", 500n)
    const cap = store.getSpendingCap("cap-1")
    assert.equal(cap?.spent, 1500n)
  })

  await test("recordSpend resets if window expired", async () => {
    const store = new ApprovalStore()
    const oldWindow = Date.now() - 86_400_001
    store.addSpendingCap(makeCap({ limit: 5000n, spent: 5000n, windowStart: oldWindow }))
    store.recordSpend("0xdApp1", 500n)
    const cap = store.getSpendingCap("cap-1")
    assert.equal(cap?.spent, 500n)
  })

  await test("getAllSpendingCaps returns all caps", async () => {
    const store = new ApprovalStore()
    store.addSpendingCap(makeCap({ id: "c1" }))
    store.addSpendingCap(makeCap({ id: "c2" }))
    assert.equal(store.getAllSpendingCaps().length, 2)
  })
}

async function runHistoryTests() {
  console.log("\n  history tests")

  await test("add history entry stores and retrieves it", async () => {
    const store = new ApprovalStore()
    store.addHistoryEntry(makeHistory())
    const history = store.getHistory()
    assert.equal(history.length, 1)
    assert.equal(history[0].changeType, "approve")
  })

  await test("getHistory filters by approvalId", async () => {
    const store = new ApprovalStore()
    store.addHistoryEntry(makeHistory({ id: "h1", approvalId: "a1" }))
    store.addHistoryEntry(makeHistory({ id: "h2", approvalId: "a2" }))
    store.addHistoryEntry(makeHistory({ id: "h3", approvalId: "a1" }))
    assert.equal(store.getHistory("a1").length, 2)
    assert.equal(store.getHistory("a2").length, 1)
  })

  await test("history entries are returned newest first", async () => {
    const store = new ApprovalStore()
    const t1 = 1000
    const t2 = 2000
    store.addHistoryEntry(makeHistory({ id: "h1", timestamp: t1 }))
    store.addHistoryEntry(makeHistory({ id: "h2", timestamp: t2 }))
    const entries = store.getHistory()
    assert.equal(entries[0].id, "h2")
    assert.equal(entries[1].id, "h1")
  })

  await test("history respects limit", async () => {
    const store = new ApprovalStore(3)
    for (let i = 0; i < 5; i++) {
      store.addHistoryEntry(makeHistory({ id: `h${i}`, timestamp: i }))
    }
    assert.equal(store.getHistory().length, 3)
  })

  await test("clearHistory removes all entries", async () => {
    const store = new ApprovalStore()
    store.addHistoryEntry(makeHistory())
    store.clearHistory()
    assert.equal(store.getHistory().length, 0)
  })
}

async function runEventTests() {
  console.log("\n  event subscription tests")

  await test("subscribe receives approval_added event", async () => {
    const store = new ApprovalStore()
    let received: unknown = null
    const unsub = store.subscribe("approval_added", (data) => { received = data })
    store.addApproval(makeApproval())
    assert.ok(received)
    assert.equal((received as { approval: Approval }).approval.id, "approval-1")
    unsub()
  })

  await test("subscribe receives approval_updated event", async () => {
    const store = new ApprovalStore()
    let received: unknown = null
    const unsub = store.subscribe("approval_updated", (data) => { received = data })
    store.addApproval(makeApproval())
    store.updateApproval("approval-1", { allowance: 500n })
    assert.ok(received)
    assert.equal((received as { approval: Approval }).approval.allowance, 500n)
    unsub()
  })

  await test("subscribe receives approval_removed event", async () => {
    const store = new ApprovalStore()
    let received: unknown = null
    const unsub = store.subscribe("approval_removed", (data) => { received = data })
    store.addApproval(makeApproval())
    store.removeApproval("approval-1")
    assert.ok(received)
    assert.equal((received as { id: string }).id, "approval-1")
    unsub()
  })

  await test("subscribe receives cap_added event", async () => {
    const store = new ApprovalStore()
    let received: unknown = null
    const unsub = store.subscribe("cap_added", (data) => { received = data })
    store.addSpendingCap(makeCap())
    assert.ok(received)
    assert.equal((received as { cap: SpendingCap }).cap.id, "cap-1")
    unsub()
  })

  await test("subscribe receives history_added event", async () => {
    const store = new ApprovalStore()
    let received: unknown = null
    const unsub = store.subscribe("history_added", (data) => { received = data })
    store.addHistoryEntry(makeHistory())
    assert.ok(received)
    assert.equal((received as { entry: ApprovalHistoryEntry }).entry.changeType, "approve")
    unsub()
  })

  await test("unsubscribe stops receiving events", async () => {
    const store = new ApprovalStore()
    let count = 0
    const unsub = store.subscribe("approval_added", () => { count++ })
    unsub()
    store.addApproval(makeApproval())
    assert.equal(count, 0)
  })

  await test("clear wipes all state and listeners", async () => {
    const store = new ApprovalStore()
    let count = 0
    store.subscribe("approval_added", () => { count++ })
    store.addApproval(makeApproval({ id: "a1" }))
    store.addSpendingCap(makeCap())
    store.addHistoryEntry(makeHistory())
    assert.equal(count, 1)
    store.clear()
    assert.equal(store.getAllApprovals().length, 0)
    assert.equal(store.getAllSpendingCaps().length, 0)
    assert.equal(store.getHistory().length, 0)
    store.addApproval(makeApproval({ id: "a2" }))
    assert.equal(count, 1)
  })
}

async function run() {
  console.log("\nApproval Manager — unit tests\n")
  await runApprovalTests()
  await runSpendingCapTests()
  await runHistoryTests()
  await runEventTests()

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
    console.log("\n\u2705 All approval manager tests passed.\n")
  }
}

run()
