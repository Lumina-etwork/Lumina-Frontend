import assert from "node:assert/strict";
import { createOtelLogger } from "../otelLogger";

const originalInfo = console.info;
const originalError = console.error;

function run(name: string, fn: () => void): void {
  try {
    fn();
    originalInfo(`✓ ${name}`);
  } catch (error) {
    originalError(`✗ ${name}`);
    originalError(error);
    process.exitCode = 1;
  }
}

run("emits OpenTelemetry-compatible severity and resource fields", () => {
  const logger = createOtelLogger({
    serviceName: "test-service",
    serviceVersion: "1.2.3",
    deploymentEnvironment: "test",
    loggerName: "unit-test",
    now: () => new Date("2026-01-02T03:04:05.000Z"),
  });

  const record = logger.info("audit.completed", { "http.response.status_code": 200 });

  assert.equal(record.timestamp, "2026-01-02T03:04:05.000Z");
  assert.equal(record.severity_text, "INFO");
  assert.equal(record.severity_number, 9);
  assert.equal(record.resource["service.name"], "test-service");
  assert.equal(record.resource["service.version"], "1.2.3");
  assert.equal(record.resource["deployment.environment.name"], "test");
  assert.equal(record.attributes["event.name"], "audit.completed");
  assert.equal(record.attributes["log.logger"], "unit-test");
  assert.equal(record.attributes["http.response.status_code"], 200);
});

run("redacts sensitive attribute values before writing", () => {
  const logger = createOtelLogger({ serviceName: "test-service" });
  const record = logger.info("auth.failed", {
    userId: "user-1",
    accessToken: "abc123",
    "api_key": "secret",
  });

  assert.equal(record.attributes.userId, "user-1");
  assert.equal(record.attributes.accessToken, "[REDACTED]");
  assert.equal(record.attributes.api_key, "[REDACTED]");
});
