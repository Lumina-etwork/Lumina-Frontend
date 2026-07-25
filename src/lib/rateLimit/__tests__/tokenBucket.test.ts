import assert from "node:assert/strict";
import { TenantTokenBucketLimiter, type TenantRateLimitPolicy } from "../tokenBucket";

async function test(name: string, fn: () => void): Promise<void> {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const policy: TenantRateLimitPolicy = {
  tenantId: "tenant-a",
  capacity: 5,
  refillTokensPerSecond: 2,
};

void (async () => {
  let now = 0;
  const limiter = new TenantTokenBucketLimiter(() => now);

  await test("allows requests until the tenant bucket is empty", () => {
    for (let i = 0; i < 5; i += 1) {
      assert.equal(limiter.check(policy).allowed, true);
    }

    const denied = limiter.check(policy);
    assert.equal(denied.allowed, false);
    assert.equal(denied.retryAfterMs, 500);
  });

  await test("refills tokens based on elapsed time", () => {
    now += 1_000;

    assert.equal(limiter.check(policy, 2).allowed, true);
    assert.equal(limiter.check(policy).allowed, false);
  });

  await test("isolates buckets per tenant", () => {
    const other = limiter.check({ ...policy, tenantId: "tenant-b" }, 5);

    assert.equal(other.allowed, true);
    assert.equal(other.remainingTokens, 0);
  });

  await test("supports explicit burst capacity", () => {
    const burstLimiter = new TenantTokenBucketLimiter(() => 0);
    const burstPolicy = { ...policy, tenantId: "tenant-c", burstCapacity: 8 };

    assert.equal(burstLimiter.check(burstPolicy, 8).allowed, true);
    assert.equal(burstLimiter.check(burstPolicy).allowed, false);
  });

  await test("validates policy input", () => {
    assert.throws(() => limiter.check({ ...policy, tenantId: "" }), /tenantId/);
    assert.throws(() => limiter.check({ ...policy, capacity: 0 }), /capacity/);
    assert.throws(() => limiter.check(policy, 0), /cost/);
  });
})();
