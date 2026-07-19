/**
 * Pure configuration diff engine.
 * Flattens nested snapshots and compares expected vs actual with severity rules.
 */

import type { ServiceBaseline } from "./baseline";
import { redactValue } from "./redact";
import type {
  ConfigValue,
  DriftFinding,
  DriftSeverity,
  RuntimeConfigSnapshot,
} from "./types";

function isPlainObject(value: unknown): value is Record<string, ConfigValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Flatten nested config into dot-path → value map. */
export function flattenConfig(
  snapshot: RuntimeConfigSnapshot,
  prefix = "",
): Map<string, ConfigValue> {
  const result = new Map<string, ConfigValue>();

  for (const [key, value] of Object.entries(snapshot)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      for (const [childPath, childValue] of flattenConfig(value, path)) {
        result.set(childPath, childValue);
      }
    } else {
      result.set(path, value);
    }
  }

  return result;
}

function valuesEqual(a: ConfigValue, b: ConfigValue): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => valuesEqual(item, b[index]));
  }
  return false;
}

function severityForPath(
  path: string,
  baseline: ServiceBaseline,
): DriftSeverity {
  if (baseline.criticalPaths.includes(path)) return "critical";
  if (baseline.warningPaths.includes(path)) return "warning";
  return "info";
}

/**
 * Compare expected baseline against a live snapshot.
 * Missing keys in actual and unexpected keys are both reported.
 */
export function diffConfigs(
  baseline: ServiceBaseline,
  actual: RuntimeConfigSnapshot,
): DriftFinding[] {
  const expectedFlat = flattenConfig(baseline.expected);
  const actualFlat = flattenConfig(actual);
  const findings: DriftFinding[] = [];
  const paths = new Set([...expectedFlat.keys(), ...actualFlat.keys()]);

  for (const path of paths) {
    const expected = expectedFlat.has(path)
      ? expectedFlat.get(path)
      : undefined;
    const observed = actualFlat.has(path) ? actualFlat.get(path) : undefined;

    if (valuesEqual(expected, observed)) continue;

    findings.push({
      path,
      expected: redactValue(path, expected),
      actual: redactValue(path, observed),
      severity: severityForPath(path, baseline),
      service: baseline.service,
    });
  }

  findings.sort((a, b) => a.path.localeCompare(b.path));
  return findings;
}
