import type { ConfigValue, DriftFinding, RuntimeConfigSnapshot } from "./types";

export type SchemaValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null";

export interface ConfigSchemaRule {
  path: string;
  type: SchemaValueType | SchemaValueType[];
  required?: boolean;
  allowedValues?: readonly ConfigValue[];
  min?: number;
  max?: number;
  pattern?: RegExp;
  severity?: DriftFinding["severity"];
}

export interface ConfigSchema {
  service: string;
  rules: ConfigSchemaRule[];
}

function getPathValue(
  snapshot: RuntimeConfigSnapshot,
  path: string,
): ConfigValue {
  return path.split(".").reduce<ConfigValue>((current, segment) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      return (current as Record<string, ConfigValue>)[segment];
    }
    return undefined;
  }, snapshot);
}

function valueType(value: ConfigValue): SchemaValueType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as SchemaValueType;
}

function formatExpected(rule: ConfigSchemaRule): string {
  const types = Array.isArray(rule.type) ? rule.type.join("|") : rule.type;
  const constraints = [
    rule.required ? "required" : "optional",
    rule.allowedValues ? `allowed=${rule.allowedValues.join("|")}` : undefined,
    rule.min != null ? `min=${rule.min}` : undefined,
    rule.max != null ? `max=${rule.max}` : undefined,
    rule.pattern ? `pattern=${rule.pattern.source}` : undefined,
  ].filter(Boolean);

  return `${types} (${constraints.join(", ")})`;
}

export function validateConfigSchema(
  schema: ConfigSchema,
  snapshot: RuntimeConfigSnapshot,
): DriftFinding[] {
  const findings: DriftFinding[] = [];

  for (const rule of schema.rules) {
    const actual = getPathValue(snapshot, rule.path);
    const severity = rule.severity ?? "critical";

    if (actual === undefined) {
      if (rule.required) {
        findings.push({
          path: rule.path,
          expected: formatExpected(rule),
          actual: "missing",
          severity,
          service: schema.service,
        });
      }
      continue;
    }

    const allowedTypes = Array.isArray(rule.type) ? rule.type : [rule.type];
    const actualType = valueType(actual);
    if (!allowedTypes.includes(actualType)) {
      findings.push({
        path: rule.path,
        expected: formatExpected(rule),
        actual: actualType,
        severity,
        service: schema.service,
      });
      continue;
    }

    if (
      rule.allowedValues &&
      !rule.allowedValues.some((v) => Object.is(v, actual))
    ) {
      findings.push({
        path: rule.path,
        expected: formatExpected(rule),
        actual,
        severity,
        service: schema.service,
      });
    }

    if (typeof actual === "number") {
      if (rule.min != null && actual < rule.min) {
        findings.push({
          path: rule.path,
          expected: formatExpected(rule),
          actual,
          severity,
          service: schema.service,
        });
      }
      if (rule.max != null && actual > rule.max) {
        findings.push({
          path: rule.path,
          expected: formatExpected(rule),
          actual,
          severity,
          service: schema.service,
        });
      }
    }

    if (
      typeof actual === "string" &&
      rule.pattern &&
      !rule.pattern.test(actual)
    ) {
      findings.push({
        path: rule.path,
        expected: formatExpected(rule),
        actual,
        severity,
        service: schema.service,
      });
    }
  }

  return findings;
}

export const DEFAULT_CONFIG_SCHEMAS: ConfigSchema[] = [
  {
    service: "soroban-rpc",
    rules: [
      {
        path: "serverUrl",
        type: "string",
        required: true,
        pattern: /^https:\/\//,
        severity: "critical",
      },
      {
        path: "networkPassphrase",
        type: "string",
        required: true,
        severity: "critical",
      },
    ],
  },
  {
    service: "api-client",
    rules: [
      { path: "baseUrl", type: "string", required: true, severity: "warning" },
    ],
  },
  {
    service: "deployment",
    rules: [
      {
        path: "channel",
        type: "string",
        required: true,
        allowedValues: ["stable", "blue", "green", "canary"],
        severity: "critical",
      },
      {
        path: "releaseSlot",
        type: "string",
        required: true,
        allowedValues: ["blue", "green"],
        severity: "warning",
      },
      {
        path: "canaryPercent",
        type: "number",
        required: false,
        min: 0,
        max: 100,
        severity: "warning",
      },
    ],
  },
  {
    service: "mesh-network",
    rules: [
      {
        path: "maxPeers",
        type: "number",
        required: true,
        min: 1,
        max: 250,
        severity: "warning",
      },
      {
        path: "iceTimeoutMs",
        type: "number",
        required: true,
        min: 500,
        max: 30_000,
        severity: "warning",
      },
      {
        path: "maxMessageSize",
        type: "number",
        required: true,
        min: 1_024,
        max: 1_048_576,
        severity: "warning",
      },
    ],
  },
];
