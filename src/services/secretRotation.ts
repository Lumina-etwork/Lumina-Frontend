import { createRotationReport, DAY_MS, type RotationReport, type SecretDescriptor } from "@/src/lib/secretRotation";

export type RotationListener = (report: RotationReport) => void;

export function createDefaultSecretInventory(now = Date.now()): SecretDescriptor[] {
  return [
    { id: "db-primary", service: "postgres-primary", kind: "database", owner: "platform", lastRotatedAt: now - 85 * DAY_MS, rotationIntervalMs: 90 * DAY_MS, gracePeriodMs: 7 * DAY_MS, version: "v42", canaryWeight: 5 },
    { id: "horizon-api", service: "horizon-gateway", kind: "api-key", owner: "integrations", lastRotatedAt: now - 32 * DAY_MS, rotationIntervalMs: 30 * DAY_MS, gracePeriodMs: 3 * DAY_MS, version: "v18", canaryWeight: 10 },
    { id: "alerts-webhook", service: "alert-pipeline", kind: "api-key", owner: "secops", lastRotatedAt: now - 61 * DAY_MS, rotationIntervalMs: 60 * DAY_MS, gracePeriodMs: 1 * DAY_MS, version: "v7", canaryWeight: 5 },
  ];
}

export class SecretRotationService {
  private listeners = new Set<RotationListener>();
  private lastReport: RotationReport | null = null;

  constructor(private readonly inventory: () => SecretDescriptor[] = createDefaultSecretInventory) {}

  assess(now = Date.now()): RotationReport {
    const startedAt = Date.now();
    const report = createRotationReport(this.inventory(), now, startedAt);
    this.lastReport = report;
    this.listeners.forEach((listener) => listener(report));
    return report;
  }

  subscribe(listener: RotationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getLastReport(): RotationReport | null {
    return this.lastReport;
  }
}

let singleton: SecretRotationService | null = null;
export function getSecretRotationService(): SecretRotationService {
  singleton ??= new SecretRotationService();
  return singleton;
}
