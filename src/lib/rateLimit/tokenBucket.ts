export interface TenantRateLimitPolicy {
  tenantId: string;
  capacity: number;
  refillTokensPerSecond: number;
  burstCapacity?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  tenantId: string;
  remainingTokens: number;
  retryAfterMs: number;
  resetAtMs: number;
}

interface BucketState {
  tokens: number;
  updatedAtMs: number;
}

const DEFAULT_NOW = () => Date.now();

function assertFinitePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite positive number`);
  }
}

function normalizePolicy(policy: TenantRateLimitPolicy): Required<TenantRateLimitPolicy> {
  if (!policy.tenantId.trim()) {
    throw new Error("tenantId is required");
  }
  assertFinitePositive("capacity", policy.capacity);
  assertFinitePositive("refillTokensPerSecond", policy.refillTokensPerSecond);

  const burstCapacity = policy.burstCapacity ?? policy.capacity;
  assertFinitePositive("burstCapacity", burstCapacity);

  return {
    ...policy,
    burstCapacity: Math.max(policy.capacity, burstCapacity),
  };
}

export class TenantTokenBucketLimiter {
  private readonly buckets = new Map<string, BucketState>();
  private readonly now: () => number;

  constructor(now: () => number = DEFAULT_NOW) {
    this.now = now;
  }

  check(policyInput: TenantRateLimitPolicy, cost = 1): RateLimitDecision {
    assertFinitePositive("cost", cost);
    const policy = normalizePolicy(policyInput);
    const nowMs = this.now();
    const bucket = this.refill(policy, nowMs);

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return this.toDecision(true, policy, bucket, nowMs, cost);
    }

    return this.toDecision(false, policy, bucket, nowMs, cost);
  }

  reset(tenantId?: string): void {
    if (tenantId) {
      this.buckets.delete(tenantId);
      return;
    }

    this.buckets.clear();
  }

  private refill(policy: Required<TenantRateLimitPolicy>, nowMs: number): BucketState {
    const existing = this.buckets.get(policy.tenantId) ?? {
      tokens: policy.burstCapacity,
      updatedAtMs: nowMs,
    };
    const elapsedSeconds = Math.max(0, (nowMs - existing.updatedAtMs) / 1000);
    const tokens = Math.min(
      policy.burstCapacity,
      existing.tokens + elapsedSeconds * policy.refillTokensPerSecond,
    );
    const next = { tokens, updatedAtMs: nowMs };
    this.buckets.set(policy.tenantId, next);
    return next;
  }

  private toDecision(
    allowed: boolean,
    policy: Required<TenantRateLimitPolicy>,
    bucket: BucketState,
    nowMs: number,
    cost: number,
  ): RateLimitDecision {
    const deficit = Math.max(0, cost - bucket.tokens);
    const retryAfterMs = allowed ? 0 : Math.ceil((deficit / policy.refillTokensPerSecond) * 1000);
    const tokensToFull = Math.max(0, policy.burstCapacity - bucket.tokens);

    return {
      allowed,
      tenantId: policy.tenantId,
      remainingTokens: Math.floor(bucket.tokens),
      retryAfterMs,
      resetAtMs: nowMs + Math.ceil((tokensToFull / policy.refillTokensPerSecond) * 1000),
    };
  }
}
