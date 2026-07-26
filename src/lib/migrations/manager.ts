import type {
  Migration,
  MigrationContext,
  MigrationRecord,
  MigrationRunResult,
  MigrationSnapshot,
  MigrationTelemetryEvent,
} from "./types";

export const MIGRATION_CRITICAL_PATH_BUDGET_MS = 100;

function nowIso(): string {
  return new Date().toISOString();
}

function cloneState<TState>(state: TState): TState {
  if (typeof structuredClone === "function") {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as TState;
}

function checksumMigration<TState>(migration: Migration<TState>): string {
  const payload = `${migration.version}:${migration.name}:${migration.description}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function validateMigrations(migrations: Migration[]): Migration[] {
  const ordered = [...migrations].sort((a, b) => a.version - b.version);
  const seen = new Set<number>();
  for (const migration of ordered) {
    if (!Number.isInteger(migration.version) || migration.version <= 0) {
      throw new Error(`Invalid migration version: ${migration.version}`);
    }
    if (seen.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }
    seen.add(migration.version);
  }
  return ordered;
}

function event<TState>(
  type: MigrationTelemetryEvent["type"],
  migration: Migration<TState>,
  details: Partial<MigrationTelemetryEvent> = {},
): MigrationTelemetryEvent {
  return {
    type,
    version: migration.version,
    name: migration.name,
    timestamp: nowIso(),
    ...details,
  };
}

export class MigrationManager<TState = Record<string, unknown>> {
  private readonly migrations: Migration<TState>[];

  constructor(migrations: Migration<TState>[]) {
    this.migrations = validateMigrations(migrations as Migration[]) as Migration<TState>[];
  }

  get latestVersion(): number {
    return this.migrations.at(-1)?.version ?? 0;
  }

  async migrate(
    initialState: TState,
    currentVersion: number,
    targetVersion = this.latestVersion,
  ): Promise<MigrationRunResult<TState>> {
    let state = cloneState(initialState);
    const records: MigrationRecord[] = [];
    const snapshots: MigrationSnapshot<TState>[] = [];
    const telemetry: MigrationTelemetryEvent[] = [];
    const pending = this.migrations.filter(
      (migration) => migration.version > currentVersion && migration.version <= targetVersion,
    );

    for (const migration of pending) {
      const startedAt = nowIso();
      const started = performance.now();
      const snapshot: MigrationSnapshot<TState> = {
        id: `pre-${migration.version}-${Date.now()}`,
        version: migration.version - 1,
        createdAt: startedAt,
        state: cloneState(state),
      };
      snapshots.push(snapshot);
      telemetry.push(event("migration_started", migration));

      try {
        const context: MigrationContext<TState> = { state, direction: "up", startedAt };
        state = await migration.up(context);
        const durationMs = performance.now() - started;
        records.push({
          version: migration.version,
          name: migration.name,
          checksum: checksumMigration(migration),
          status: "applied",
          appliedAt: nowIso(),
          durationMs,
        });
        telemetry.push(event("migration_applied", migration, { durationMs }));
        if (durationMs > MIGRATION_CRITICAL_PATH_BUDGET_MS) {
          telemetry.push(
            event("migration_slo_warning", migration, {
              durationMs,
              message: `Migration exceeded ${MIGRATION_CRITICAL_PATH_BUDGET_MS}ms critical path budget`,
            }),
          );
        }
      } catch (err) {
        const durationMs = performance.now() - started;
        const message = err instanceof Error ? err.message : String(err);
        records.push({
          version: migration.version,
          name: migration.name,
          checksum: checksumMigration(migration),
          status: "failed",
          durationMs,
          error: message,
        });
        telemetry.push(event("migration_failed", migration, { durationMs, message }));
        state = cloneState(snapshot.state);
        break;
      }
    }

    return { state, records, snapshots, telemetry };
  }

  async rollback(
    currentState: TState,
    currentVersion: number,
    targetVersion: number,
  ): Promise<MigrationRunResult<TState>> {
    if (targetVersion < 0 || targetVersion >= currentVersion) {
      throw new Error("Rollback target must be lower than current version");
    }

    let state = cloneState(currentState);
    const records: MigrationRecord[] = [];
    const snapshots: MigrationSnapshot<TState>[] = [];
    const telemetry: MigrationTelemetryEvent[] = [];
    const pending = this.migrations
      .filter((migration) => migration.version <= currentVersion && migration.version > targetVersion)
      .sort((a, b) => b.version - a.version);

    for (const migration of pending) {
      const startedAt = nowIso();
      const started = performance.now();
      snapshots.push({
        id: `rollback-pre-${migration.version}-${Date.now()}`,
        version: migration.version,
        createdAt: startedAt,
        state: cloneState(state),
      });

      try {
        const context: MigrationContext<TState> = { state, direction: "down", startedAt };
        state = await migration.down(context);
        const durationMs = performance.now() - started;
        records.push({
          version: migration.version,
          name: migration.name,
          checksum: checksumMigration(migration),
          status: "rolled_back",
          rolledBackAt: nowIso(),
          durationMs,
        });
        telemetry.push(event("migration_rolled_back", migration, { durationMs }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        records.push({
          version: migration.version,
          name: migration.name,
          checksum: checksumMigration(migration),
          status: "failed",
          durationMs: performance.now() - started,
          error: message,
        });
        telemetry.push(event("migration_failed", migration, { message }));
        break;
      }
    }

    return { state, records, snapshots, telemetry };
  }
}
