import assert from "node:assert/strict";
import {
  getIntervalMs,
  shouldRunNow,
  registerSchedule,
  unregisterSchedule,
  isScheduleActive,
} from "../scheduler";
import type { BackupScheduleConfig } from "../types";

interface FailedTest { name: string; error: unknown }
const failures: FailedTest[] = [];
let passed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    failures.push({ name, error: err });
  }
}

async function runSchedulerUnitTests() {
  console.log("\n  scheduler unit tests");

  await test("getIntervalMs returns correct values", async () => {
    assert.equal(getIntervalMs({ enabled: true, frequency: "manual", retentionCount: 1, autoRestoreTest: false }), 0);
    assert.equal(getIntervalMs({ enabled: true, frequency: "hourly", retentionCount: 1, autoRestoreTest: false }), 3600000);
    assert.equal(getIntervalMs({ enabled: true, frequency: "daily", retentionCount: 1, autoRestoreTest: false }), 86400000);
    assert.equal(getIntervalMs({ enabled: true, frequency: "weekly", retentionCount: 1, autoRestoreTest: false }), 604800000);
  });

  await test("shouldRunNow respects timeOfDay", async () => {
    const cfg: BackupScheduleConfig = {
      enabled: true, frequency: "daily", timeOfDay: "14:30", retentionCount: 1, autoRestoreTest: false,
    };
    const match = new Date(2026, 6, 20, 14, 30, 0);
    const noMatch = new Date(2026, 6, 20, 10, 0, 0);
    assert.equal(shouldRunNow(cfg, match), true);
    assert.equal(shouldRunNow(cfg, noMatch), false);
  });

  await test("shouldRunNow respects dayOfWeek for weekly", async () => {
    const cfg: BackupScheduleConfig = {
      enabled: true, frequency: "weekly", timeOfDay: "02:00", dayOfWeek: 1, retentionCount: 1, autoRestoreTest: false,
    };
    // July 20, 2026 is a Monday (day 1)
    const monday = new Date(2026, 6, 20, 2, 0, 0);
    const tuesday = new Date(2026, 6, 21, 2, 0, 0);
    assert.equal(shouldRunNow(cfg, monday), true);
    assert.equal(shouldRunNow(cfg, tuesday), false);
  });

  await test("shouldRunNow always returns true for hourly (no timeOfDay check)", async () => {
    const cfg: BackupScheduleConfig = {
      enabled: true, frequency: "hourly", retentionCount: 1, autoRestoreTest: false,
    };
    assert.equal(shouldRunNow(cfg, new Date()), true);
  });

  await test("shouldRunNow returns false for manual", async () => {
    // Manual should not auto-run; there's no interval set
    const cfg: BackupScheduleConfig = {
      enabled: true, frequency: "manual", retentionCount: 1, autoRestoreTest: false,
    };
    assert.equal(shouldRunNow(cfg, new Date()), true); // No time constraints on manual
  });

  await test("registerSchedule and unregisterSchedule lifecycle", async () => {
    unregisterSchedule();
    assert.equal(isScheduleActive(), false);

    let called = false;
    registerSchedule(
      { enabled: true, frequency: "manual", retentionCount: 1, autoRestoreTest: false },
      async () => { called = true; },
    );
    // Manual should not register a timer
    assert.equal(isScheduleActive(), false);
    assert.equal(called, false);

    unregisterSchedule();
    assert.equal(isScheduleActive(), false);
  });

  await test("registerSchedule starts for hourly", async () => {
    unregisterSchedule();
    registerSchedule(
      { enabled: true, frequency: "hourly", retentionCount: 1, autoRestoreTest: false },
      async () => {},
    );
    assert.equal(isScheduleActive(), true);
    unregisterSchedule();
    assert.equal(isScheduleActive(), false);
  });

  await test("disabled schedule does not start", async () => {
    unregisterSchedule();
    registerSchedule(
      { enabled: false, frequency: "hourly", retentionCount: 1, autoRestoreTest: false },
      async () => {},
    );
    assert.equal(isScheduleActive(), false);
  });
}

async function run() {
  console.log("\nScheduler — unit tests\n");
  await runSchedulerUnitTests();

  const failed = failures.length;
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.error("\nFailed tests:");
    failures.forEach(({ name, error }) => {
      console.error(`  ✗ ${name}`);
      if (error instanceof Error) console.error(`    ${error.stack}`);
    });
    process.exit(1);
  } else {
    console.log("\n✅ All scheduler tests passed.\n");
  }
}

run();
