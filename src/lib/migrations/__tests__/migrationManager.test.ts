import assert from "node:assert/strict";
import { MigrationManager, MIGRATION_CRITICAL_PATH_BUDGET_MS } from "../manager";
import type { Migration } from "../types";

interface TestState {
  users: Array<{ id: string; name?: string; displayName?: string }>;
  indexes: string[];
}

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

const migrations: Migration<TestState>[] = [
  {
    version: 2,
    name: "rename-user-name",
    description: "Move user.name into user.displayName.",
    up: ({ state }) => ({
      ...state,
      users: state.users.map(({ name, ...user }) => ({ ...user, displayName: name })),
    }),
    down: ({ state }) => ({
      ...state,
      users: state.users.map(({ displayName, ...user }) => ({ ...user, name: displayName })),
    }),
  },
  {
    version: 3,
    name: "add-user-index",
    description: "Add an index used by user lookup queries.",
    up: ({ state }) => ({ ...state, indexes: [...state.indexes, "users.byDisplayName"] }),
    down: ({ state }) => ({
      ...state,
      indexes: state.indexes.filter((index) => index !== "users.byDisplayName"),
    }),
  },
];

async function runTests() {
  console.log("\n  migration manager tests");

  await test("applies migrations in version order and records telemetry", async () => {
    const manager = new MigrationManager([...migrations].reverse());
    const result = await manager.migrate({ users: [{ id: "1", name: "Ada" }], indexes: [] }, 1);

    assert.equal(manager.latestVersion, 3);
    assert.deepEqual(result.state, {
      users: [{ id: "1", displayName: "Ada" }],
      indexes: ["users.byDisplayName"],
    });
    assert.deepEqual(result.records.map((record) => record.version), [2, 3]);
    assert.equal(result.snapshots.length, 2);
    assert.ok(result.telemetry.some((event) => event.type === "migration_applied"));
  });

  await test("rolls back with down migrations in reverse order", async () => {
    const manager = new MigrationManager(migrations);
    const result = await manager.rollback(
      { users: [{ id: "1", displayName: "Ada" }], indexes: ["users.byDisplayName"] },
      3,
      1,
    );

    assert.deepEqual(result.records.map((record) => `${record.version}:${record.status}`), [
      "3:rolled_back",
      "2:rolled_back",
    ]);
    assert.deepEqual(result.state, { users: [{ id: "1", name: "Ada" }], indexes: [] });
  });

  await test("restores the pre-migration snapshot when an up migration fails", async () => {
    const manager = new MigrationManager<TestState>([
      migrations[0],
      {
        version: 3,
        name: "broken-index",
        description: "Simulates a failed production migration.",
        up: () => {
          throw new Error("index build failed");
        },
        down: ({ state }) => state,
      },
    ]);

    const result = await manager.migrate({ users: [{ id: "1", name: "Ada" }], indexes: [] }, 1);

    assert.equal(result.records.at(-1)?.status, "failed");
    assert.equal(result.records.at(-1)?.error, "index build failed");
    assert.deepEqual(result.state, { users: [{ id: "1", displayName: "Ada" }], indexes: [] });
  });

  await test("rejects duplicate migration versions", async () => {
    assert.throws(
      () => new MigrationManager<TestState>([migrations[0], migrations[0]]),
      /Duplicate migration version/,
    );
  });

  await test("exports the 100ms critical path budget", async () => {
    assert.equal(MIGRATION_CRITICAL_PATH_BUDGET_MS, 100);
  });

  if (failures.length > 0) {
    console.error(`\n${failures.length} migration manager test(s) failed`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n${passed} migration manager test(s) passed`);
}

runTests();
