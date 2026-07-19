/**
 * Runtime configuration auditor.
 * Captures live service configs, diffs against baselines, emits drift alerts,
 * and tracks canary / blue-green audit history under a <100ms P99 budget.
 */

import {
  ALL_BASELINES,
  ALLOWED_DEPLOY_CHANNELS,
  BASELINE_VERSION,
  PERFORMANCE_BUDGET_MS,
  analyzeCanary,
  diffConfigs,
  getBaseline,
  type AuditReport,
  type CanaryAnalysisResult,
  type ConfigSource,
  type DeploymentChannel,
  type DriftFinding,
  type RuntimeConfigSnapshot,
  type ServiceBaseline,
} from "../lib/config";

function snapshotForDiff(
  service: string,
  actual: RuntimeConfigSnapshot,
): RuntimeConfigSnapshot {
  if (service !== "deployment") return actual;
  // channel is allowlist-checked separately; exclude from value diff
  const { channel: _channel, ...rest } = actual;
  return rest;
}

function validateDeploymentChannel(
  actual: RuntimeConfigSnapshot,
  service: string,
): DriftFinding[] {
  const channel = actual.channel;
  if (typeof channel !== "string") {
    return [
      {
        path: "channel",
        expected: ALLOWED_DEPLOY_CHANNELS.join("|"),
        actual: channel,
        severity: "critical",
        service,
      },
    ];
  }
  if (!(ALLOWED_DEPLOY_CHANNELS as readonly string[]).includes(channel)) {
    return [
      {
        path: "channel",
        expected: ALLOWED_DEPLOY_CHANNELS.join("|"),
        actual: channel,
        severity: "critical",
        service,
      },
    ];
  }
  return [];
}

export type AuditListener = (report: AuditReport) => void;

export interface ConfigAuditOptions {
  sources?: ConfigSource[];
  baselines?: ServiceBaseline[];
  channel?: DeploymentChannel;
  now?: () => number;
  /** Override performance.now for deterministic tests. */
  clock?: () => number;
  historyLimit?: number;
}

const DEFAULT_HISTORY_LIMIT = 50;

/** Default captures mirror declared baselines so a clean boot reports no drift. */
export function createDefaultConfigSources(
  overrides: Partial<Record<string, () => RuntimeConfigSnapshot>> = {},
): ConfigSource[] {
  const captureEnv = (key: string, fallback: string): string => {
    if (typeof process === "undefined") return fallback;
    return process.env[key] ?? fallback;
  };

  const sources: ConfigSource[] = [
    {
      service: "soroban-rpc",
      capture:
        overrides["soroban-rpc"] ??
        (() => ({
          serverUrl: "https://soroban-testnet.stellar.org",
          networkPassphrase: "Test SDF Network ; September 2015",
        })),
    },
    {
      service: "api-client",
      capture:
        overrides["api-client"] ??
        (() => ({
          baseUrl: captureEnv("NEXT_PUBLIC_API_BASE_URL", ""),
        })),
    },
    {
      service: "deployment",
      capture:
        overrides.deployment ??
        (() => ({
          // channel is allowlist-validated separately; not fixed-value diffed
          channel: captureEnv("NEXT_PUBLIC_DEPLOY_CHANNEL", "stable"),
          releaseSlot: captureEnv("NEXT_PUBLIC_RELEASE_SLOT", "blue"),
        })),
    },
    {
      service: "mesh-network",
      capture:
        overrides["mesh-network"] ??
        (() => ({
          maxPeers: 10,
          iceTimeoutMs: 5_000,
          maxMessageSize: 16_384,
        })),
    },
  ];

  return sources;
}

export class ConfigAuditor {
  private sources: Map<string, ConfigSource>;
  private baselines: Map<string, ServiceBaseline>;
  private listeners = new Set<AuditListener>();
  private history: AuditReport[] = [];
  private channel: DeploymentChannel;
  private now: () => number;
  private clock: () => number;
  private historyLimit: number;
  private lastSystemReport: AuditReport | null = null;

  constructor(options: ConfigAuditOptions = {}) {
    this.sources = new Map(
      (options.sources ?? createDefaultConfigSources()).map((s) => [
        s.service,
        s,
      ]),
    );
    this.baselines = new Map(
      (options.baselines ?? ALL_BASELINES).map((b) => [b.service, b]),
    );
    this.channel = options.channel ?? "stable";
    this.now = options.now ?? (() => Date.now());
    this.clock =
      options.clock ??
      (() =>
        typeof performance !== "undefined" ? performance.now() : Date.now());
    this.historyLimit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT;
  }

  registerSource(source: ConfigSource): void {
    this.sources.set(source.service, source);
  }

  unregisterSource(service: string): void {
    this.sources.delete(service);
  }

  setBaseline(baseline: ServiceBaseline): void {
    this.baselines.set(baseline.service, baseline);
  }

  setChannel(channel: DeploymentChannel): void {
    this.channel = channel;
  }

  subscribe(listener: AuditListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getHistory(): AuditReport[] {
    return [...this.history];
  }

  getLastReport(): AuditReport | null {
    return this.lastSystemReport;
  }

  /**
   * Audit a single registered service. Critical path — must stay <100ms.
   */
  auditService(service: string): AuditReport {
    const started = this.clock();
    const source = this.sources.get(service);
    const baseline = this.baselines.get(service) ?? getBaseline(service);

    if (!source || !baseline) {
      const durationMs = this.clock() - started;
      const report: AuditReport = {
        ok: false,
        findings: [
          {
            path: "_registry",
            expected: service,
            actual: source ? "missing-baseline" : "missing-source",
            severity: "critical",
            service,
          },
        ],
        metrics: {
          durationMs,
          withinBudget: durationMs < PERFORMANCE_BUDGET_MS,
          findingCount: 1,
          criticalCount: 1,
          warningCount: 0,
          infoCount: 0,
          auditedAt: this.now(),
        },
        baselineVersion: BASELINE_VERSION,
        channel: this.channel,
        service,
      };
      this.record(report);
      return report;
    }

    let actual: RuntimeConfigSnapshot;
    try {
      actual = source.capture();
    } catch (error) {
      const durationMs = this.clock() - started;
      const report: AuditReport = {
        ok: false,
        findings: [
          {
            path: "_capture",
            expected: "snapshot",
            actual: error instanceof Error ? error.message : "capture-failed",
            severity: "critical",
            service,
          },
        ],
        metrics: {
          durationMs,
          withinBudget: durationMs < PERFORMANCE_BUDGET_MS,
          findingCount: 1,
          criticalCount: 1,
          warningCount: 0,
          infoCount: 0,
          auditedAt: this.now(),
        },
        baselineVersion: BASELINE_VERSION,
        channel: this.channel,
        service,
      };
      this.record(report);
      return report;
    }

    const snapshot = actual ?? {};
    const findings = [
      ...diffConfigs(baseline, snapshotForDiff(service, snapshot)),
      ...(service === "deployment"
        ? validateDeploymentChannel(snapshot, service)
        : []),
    ];
    const durationMs = this.clock() - started;
    const report = this.buildReport(service, findings, durationMs);
    this.record(report);
    return report;
  }

  /**
   * System-wide audit across every registered service source.
   */
  auditAll(): AuditReport {
    const started = this.clock();
    const findings: DriftFinding[] = [];
    const services = new Set([
      ...this.sources.keys(),
      ...this.baselines.keys(),
    ]);

    for (const service of services) {
      const source = this.sources.get(service);
      const baseline = this.baselines.get(service);
      if (!source || !baseline) {
        findings.push({
          path: "_registry",
          expected: service,
          actual: source ? "missing-baseline" : "missing-source",
          severity: "critical",
          service,
        });
        continue;
      }

      try {
        const actual = source.capture() ?? {};
        findings.push(...diffConfigs(baseline, snapshotForDiff(service, actual)));
        if (service === "deployment") {
          findings.push(...validateDeploymentChannel(actual, service));
        }
      } catch (error) {
        findings.push({
          path: "_capture",
          expected: "snapshot",
          actual: error instanceof Error ? error.message : "capture-failed",
          severity: "critical",
          service,
        });
      }
    }

    const durationMs = this.clock() - started;
    const report = this.buildReport("*", findings, durationMs);
    this.lastSystemReport = report;
    this.record(report);
    return report;
  }

  analyzeCanaryPromotion(): CanaryAnalysisResult {
    return analyzeCanary(this.history, this.channel);
  }

  private buildReport(
    service: string,
    findings: DriftFinding[],
    durationMs: number,
  ): AuditReport {
    const criticalCount = findings.filter((f) => f.severity === "critical").length;
    const warningCount = findings.filter((f) => f.severity === "warning").length;
    const infoCount = findings.filter((f) => f.severity === "info").length;

    return {
      ok: findings.length === 0,
      findings,
      metrics: {
        durationMs,
        withinBudget: durationMs < PERFORMANCE_BUDGET_MS,
        findingCount: findings.length,
        criticalCount,
        warningCount,
        infoCount,
        auditedAt: this.now(),
      },
      baselineVersion: BASELINE_VERSION,
      channel: this.channel,
      service,
    };
  }

  private record(report: AuditReport): void {
    this.history.push(report);
    if (this.history.length > this.historyLimit) {
      this.history.splice(0, this.history.length - this.historyLimit);
    }
    for (const listener of this.listeners) {
      listener(report);
    }
  }
}

/** Process-wide singleton used by the React hook and provider bridge. */
let sharedAuditor: ConfigAuditor | null = null;

export function getConfigAuditor(): ConfigAuditor {
  if (!sharedAuditor) {
    sharedAuditor = new ConfigAuditor();
  }
  return sharedAuditor;
}

/** Test-only helper to reset the singleton between cases. */
export function resetConfigAuditorForTests(): void {
  sharedAuditor = null;
}
