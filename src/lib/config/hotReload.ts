import type { AuditReport, RuntimeConfigSnapshot } from "./types";
import { validateConfigSchema, type ConfigSchema } from "./schema";

export interface HotReloadConfigUpdate {
  service: string;
  snapshot: RuntimeConfigSnapshot;
  version: string;
  receivedAt?: number;
}

export interface HotReloadApplyResult {
  accepted: boolean;
  report: AuditReport;
}

export interface HotReloadState {
  lastVersion: string | null;
  lastReloadAt: number | null;
  acceptedReloads: number;
  rejectedReloads: number;
}

const stateByService = new Map<string, HotReloadState>();

export function getHotReloadState(service: string): HotReloadState {
  return (
    stateByService.get(service) ?? {
      lastVersion: null,
      lastReloadAt: null,
      acceptedReloads: 0,
      rejectedReloads: 0,
    }
  );
}

export function applyHotReloadUpdate(
  update: HotReloadConfigUpdate,
  schema: ConfigSchema | undefined,
  audit: (service: string, snapshot: RuntimeConfigSnapshot) => AuditReport,
): HotReloadApplyResult {
  const current = getHotReloadState(update.service);
  const schemaFindings = schema
    ? validateConfigSchema(schema, update.snapshot)
    : [];

  if (schemaFindings.some((f) => f.severity === "critical")) {
    const report = audit(update.service, update.snapshot);
    const merged = {
      ...report,
      ok: false,
      findings: [...schemaFindings, ...report.findings],
    };
    stateByService.set(update.service, {
      ...current,
      rejectedReloads: current.rejectedReloads + 1,
    });
    return { accepted: false, report: merged };
  }

  const report = audit(update.service, update.snapshot);
  stateByService.set(update.service, {
    lastVersion: update.version,
    lastReloadAt: update.receivedAt ?? Date.now(),
    acceptedReloads: current.acceptedReloads + 1,
    rejectedReloads: current.rejectedReloads,
  });
  return { accepted: report.ok, report };
}

export function resetHotReloadStateForTests(): void {
  stateByService.clear();
}
