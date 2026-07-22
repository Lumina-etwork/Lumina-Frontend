export interface TTLConfigEntry {
  ttlMs: number;
  description: string;
}

export type TTLConfig = Record<string, TTLConfigEntry>;

export const DEFAULT_TTL_MS = 30_000;

export const DEFAULT_TTL_CONFIG: TTLConfig = {
  nodes: { ttlMs: 10_000, description: "Node state — fast-changing" },
  bandwidth: { ttlMs: 30_000, description: "Bandwidth history — moderate freshness" },
  alerts: { ttlMs: 60_000, description: "Alert rules — slower-moving derived data" },
  horizon: { ttlMs: 120_000, description: "Horizon cursor pages — stable until new ledgers" },
  workspace: { ttlMs: 300_000, description: "Workspace/org metadata — rarely changes" },
  config: { ttlMs: 60_000, description: "Node config snapshots" },
  default: { ttlMs: DEFAULT_TTL_MS, description: "Fallback for unregistered groups" },
};

export function getTTLForGroup(group: string, customConfig?: TTLConfig): number {
  const config = customConfig ?? DEFAULT_TTL_CONFIG;
  return config[group]?.ttlMs ?? config.default.ttlMs;
}

export function mergeTTLConfig(overrides: Partial<TTLConfig>): TTLConfig {
  return { ...DEFAULT_TTL_CONFIG, ...overrides };
}
