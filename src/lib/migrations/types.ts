export type MigrationDirection = "up" | "down";
export type MigrationStatus = "pending" | "running" | "applied" | "rolled_back" | "failed";

export interface MigrationContext<TState = Record<string, unknown>> {
  state: TState;
  direction: MigrationDirection;
  startedAt: string;
}

export interface Migration<TState = Record<string, unknown>> {
  version: number;
  name: string;
  description: string;
  up: (context: MigrationContext<TState>) => TState | Promise<TState>;
  down: (context: MigrationContext<TState>) => TState | Promise<TState>;
}

export interface MigrationRecord {
  version: number;
  name: string;
  checksum: string;
  status: MigrationStatus;
  appliedAt?: string;
  rolledBackAt?: string;
  durationMs: number;
  error?: string;
}

export interface MigrationSnapshot<TState = Record<string, unknown>> {
  id: string;
  version: number;
  createdAt: string;
  state: TState;
}

export interface MigrationTelemetryEvent {
  type: "migration_started" | "migration_applied" | "migration_rolled_back" | "migration_failed" | "migration_slo_warning";
  version: number;
  name: string;
  durationMs?: number;
  message?: string;
  timestamp: string;
}

export interface MigrationRunResult<TState = Record<string, unknown>> {
  state: TState;
  records: MigrationRecord[];
  snapshots: MigrationSnapshot<TState>[];
  telemetry: MigrationTelemetryEvent[];
}
