import { createHash } from "node:crypto"

export type AuditSeverity = "info" | "warning" | "critical"

export interface AuditEventInput {
  action: string
  actorId: string
  resource: string
  timestamp?: string
  severity?: AuditSeverity
  metadata?: Record<string, unknown>
}

export interface AuditEntry extends Required<AuditEventInput> {
  sequence: number
  previousHash: string
  hash: string
}

export interface VerificationFailure {
  sequence: number
  reason: "sequence_gap" | "previous_hash_mismatch" | "hash_mismatch"
  expected: string | number
  actual: string | number
}

export interface VerificationReport {
  valid: boolean
  checkedEntries: number
  headHash: string
  failures: VerificationFailure[]
}

export interface AuditTrailMetrics {
  totalEntries: number
  criticalEntries: number
  verificationFailures: number
  lastVerifiedAt: string | null
  headHash: string
}

export const GENESIS_HASH = "0".repeat(64)

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`
  }

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`)
    .join(",")}}`
}

export function calculateAuditHash(entry: Omit<AuditEntry, "hash">): string {
  return createHash("sha256").update(canonicalize(entry)).digest("hex")
}

export class AuditTrail {
  private entries: AuditEntry[] = []
  private verificationFailures = 0
  private lastVerifiedAt: string | null = null

  append(input: AuditEventInput): AuditEntry {
    const previousHash = this.entries.at(-1)?.hash ?? GENESIS_HASH
    const candidate: Omit<AuditEntry, "hash"> = {
      action: input.action,
      actorId: input.actorId,
      metadata: input.metadata ?? {},
      previousHash,
      resource: input.resource,
      sequence: this.entries.length + 1,
      severity: input.severity ?? "info",
      timestamp: input.timestamp ?? new Date().toISOString(),
    }
    const entry = { ...candidate, hash: calculateAuditHash(candidate) }
    this.entries.push(entry)
    return structuredClone(entry)
  }

  getEntries(): AuditEntry[] {
    return structuredClone(this.entries)
  }

  verify(entries: AuditEntry[] = this.entries): VerificationReport {
    const failures: VerificationFailure[] = []
    let previousHash = GENESIS_HASH

    entries.forEach((entry, index) => {
      const expectedSequence = index + 1
      if (entry.sequence !== expectedSequence) {
        failures.push({ sequence: entry.sequence, reason: "sequence_gap", expected: expectedSequence, actual: entry.sequence })
      }
      if (entry.previousHash !== previousHash) {
        failures.push({ sequence: entry.sequence, reason: "previous_hash_mismatch", expected: previousHash, actual: entry.previousHash })
      }

      const { hash, ...unsignedEntry } = entry
      const expectedHash = calculateAuditHash(unsignedEntry)
      if (hash !== expectedHash) {
        failures.push({ sequence: entry.sequence, reason: "hash_mismatch", expected: expectedHash, actual: hash })
      }
      previousHash = entry.hash
    })

    this.lastVerifiedAt = new Date().toISOString()
    this.verificationFailures += failures.length

    return {
      valid: failures.length === 0,
      checkedEntries: entries.length,
      headHash: entries.at(-1)?.hash ?? GENESIS_HASH,
      failures,
    }
  }

  getMetrics(): AuditTrailMetrics {
    return {
      totalEntries: this.entries.length,
      criticalEntries: this.entries.filter((entry) => entry.severity === "critical").length,
      verificationFailures: this.verificationFailures,
      lastVerifiedAt: this.lastVerifiedAt,
      headHash: this.entries.at(-1)?.hash ?? GENESIS_HASH,
    }
  }
}

export const auditTrailRunbook = {
  p99LatencyBudgetMs: 100,
  availabilityTarget: "99.99%",
  canaryFailureThreshold: "any hash_mismatch or previous_hash_mismatch in canary traffic",
  alertRules: [
    "audit_hash_chain_verification_failed > 0 for 1 minute",
    "audit_append_latency_p99_ms > 100 for 5 minutes",
    "audit_ingestion_success_rate < 99.99% for 5 minutes",
  ],
}
