/**
 * Redacts sensitive configuration values before logging, alerting, or telemetry.
 */

import { SENSITIVE_PATH_FRAGMENTS, type ConfigValue } from "./types";

function isSensitivePath(path: string): boolean {
  const leaf =
    path
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9_]/g, "") ?? "";
  if (!leaf) return false;
  return SENSITIVE_PATH_FRAGMENTS.some(
    (fragment) => leaf === fragment || leaf.includes(fragment),
  );
}

export function redactValue(path: string, value: ConfigValue): ConfigValue {
  if (isSensitivePath(path)) {
    if (value === null || value === undefined || value === "") {
      return value;
    }
    return "[REDACTED]";
  }
  return value;
}

export function redactSnapshot(
  snapshot: Record<string, ConfigValue>,
  prefix = "",
): Record<string, ConfigValue> {
  const out: Record<string, ConfigValue> = {};
  for (const [key, value] of Object.entries(snapshot)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      out[key] = redactSnapshot(value as Record<string, ConfigValue>, path);
    } else {
      out[key] = redactValue(path, value);
    }
  }
  return out;
}
