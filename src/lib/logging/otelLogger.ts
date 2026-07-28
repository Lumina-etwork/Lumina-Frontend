export type LogSeverity = "debug" | "info" | "warn" | "error";

type AttributeValue = string | number | boolean | null | undefined;
export type LogAttributes = Record<string, AttributeValue>;

export interface StructuredLogRecord {
  timestamp: string;
  severity_text: Uppercase<LogSeverity>;
  severity_number: number;
  body: string;
  attributes: LogAttributes;
  resource: LogAttributes;
}

export interface LoggerContext {
  serviceName: string;
  serviceVersion?: string;
  deploymentEnvironment?: string;
  loggerName?: string;
  defaultAttributes?: LogAttributes;
  now?: () => Date;
}

const severityNumbers: Record<LogSeverity, number> = {
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
};

const consoleBySeverity: Record<LogSeverity, (message?: unknown, ...optionalParams: unknown[]) => void> = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

const sensitiveKeyPattern = /(password|passphrase|secret|token|api[-_]?key|authorization|cookie|private[-_]?key|seed|mnemonic)/i;

function sanitizeAttributes(attributes: LogAttributes = {}): LogAttributes {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

function getRuntimeEnvironment(): string {
  if (typeof process !== "undefined") {
    return process.env.NEXT_PUBLIC_DEPLOY_ENV ?? process.env.NODE_ENV ?? "development";
  }
  return "browser";
}

export function createOtelLogger(context: LoggerContext) {
  const baseResource: LogAttributes = {
    "service.name": context.serviceName,
    "deployment.environment.name": context.deploymentEnvironment ?? getRuntimeEnvironment(),
  };

  if (context.serviceVersion) {
    baseResource["service.version"] = context.serviceVersion;
  }

  const emit = (
    severity: LogSeverity,
    body: string,
    attributes: LogAttributes = {},
  ): StructuredLogRecord => {
    const record: StructuredLogRecord = {
      timestamp: (context.now ?? (() => new Date()))().toISOString(),
      severity_text: severity.toUpperCase() as Uppercase<LogSeverity>,
      severity_number: severityNumbers[severity],
      body,
      attributes: sanitizeAttributes({
        "event.name": body,
        ...(context.loggerName ? { "log.logger": context.loggerName } : {}),
        ...context.defaultAttributes,
        ...attributes,
      }),
      resource: baseResource,
    };

    consoleBySeverity[severity](JSON.stringify(record));
    return record;
  };

  return {
    debug: (body: string, attributes?: LogAttributes) => emit("debug", body, attributes),
    info: (body: string, attributes?: LogAttributes) => emit("info", body, attributes),
    warn: (body: string, attributes?: LogAttributes) => emit("warn", body, attributes),
    error: (body: string, attributes?: LogAttributes) => emit("error", body, attributes),
  };
}

export const telemetryLogger = createOtelLogger({
  serviceName: "lumina-frontend",
  loggerName: "telemetry-api",
});
