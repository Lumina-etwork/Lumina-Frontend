import assert from 'node:assert/strict'
import { calculateCapacityPlan, type CapacityUsageSample } from '../capacityPlanning'

function test(name: string, fn: () => void): void {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

const samples: CapacityUsageSample[] = [
  { timestamp: '2026-07-01', requests: 1000, capacity: 2000 },
  { timestamp: '2026-07-02', requests: 1200, capacity: 2000 },
  { timestamp: '2026-07-03', requests: 1440, capacity: 2000 },
]

test('computes current utilization and historical growth', () => {
  const plan = calculateCapacityPlan(samples, 3)
  assert.equal(plan.currentUtilizationPercent, 72)
  assert.equal(plan.averageGrowthPercent, 20)
  assert.equal(plan.forecast.length, 6)
})

test('recommends scaling when forecast crosses critical threshold', () => {
  const plan = calculateCapacityPlan(samples, 3)
  assert.equal(plan.recommendation, 'scale')
  assert.equal(plan.daysUntilSaturation, 2)
  assert.ok(plan.recommendedCapacity >= 2489)
})

test('returns a safe empty plan for missing telemetry', () => {
  const plan = calculateCapacityPlan([])
  assert.equal(plan.recommendation, 'stable')
  assert.equal(plan.forecast.length, 0)
  assert.equal(plan.daysUntilSaturation, null)
})
