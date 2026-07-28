export type IncidentSeverity = 'critical' | 'error' | 'warning' | 'info';

export type RunbookAction = {
  id: string;
  label: string;
  command: string;
  destructive?: boolean;
  requiresApproval?: boolean;
};

export type RunbookDefinition = {
  id: string;
  service: string;
  title: string;
  summary: string;
  dashboardUrl: string;
  escalationPolicy: string;
  actions: RunbookAction[];
};

export type IncidentSignal = {
  service: string;
  severity: IncidentSeverity;
  summary: string;
  source: string;
  dedupeKey?: string;
  timestamp?: string;
  details?: Record<string, string | number | boolean | null>;
};

export type PagerDutyTriggerPayload = {
  routing_key: string;
  event_action: 'trigger';
  dedup_key: string;
  payload: {
    summary: string;
    source: string;
    severity: IncidentSeverity;
    timestamp: string;
    component: string;
    group: string;
    class: string;
    custom_details: Record<string, unknown>;
  };
  links: Array<{ href: string; text: string }>;
};

const RUNBOOKS: RunbookDefinition[] = [
  {
    id: 'api-latency-p99',
    service: 'api',
    title: 'API critical path latency breach',
    summary: 'Triage API P99 latency above the 100ms SLO and mitigate before customer impact expands.',
    dashboardUrl: 'https://grafana.lumina.example/d/api-latency',
    escalationPolicy: 'platform-primary',
    actions: [
      { id: 'inspect-traces', label: 'Inspect slow traces', command: 'open-tempo --service api --p99 --last 15m' },
      { id: 'enable-cache-bypass', label: 'Disable risky cache bypass flags', command: 'lumina flags set api.cache_bypass false' },
      { id: 'rollback-api', label: 'Rollback latest API deployment', command: 'lumina deploy rollback api --strategy blue-green', destructive: true, requiresApproval: true },
    ],
  },
  {
    id: 'frontend-availability',
    service: 'frontend',
    title: 'Frontend availability degradation',
    summary: 'Restore Next.js edge and origin availability to maintain the 99.99% uptime target.',
    dashboardUrl: 'https://grafana.lumina.example/d/frontend-availability',
    escalationPolicy: 'web-primary',
    actions: [
      { id: 'check-edge', label: 'Check edge health', command: 'lumina edge health --service frontend' },
      { id: 'promote-green', label: 'Promote healthy green deployment', command: 'lumina deploy promote frontend --slot green --canary-analysis', requiresApproval: true },
    ],
  },
  {
    id: 'stellar-ingestion',
    service: 'stellar-ingestion',
    title: 'Stellar ingestion lag',
    summary: 'Recover ledger ingestion lag before downstream balances and vesting timelines become stale.',
    dashboardUrl: 'https://grafana.lumina.example/d/stellar-ingestion',
    escalationPolicy: 'blockchain-primary',
    actions: [
      { id: 'compare-horizon', label: 'Compare Horizon checkpoints', command: 'lumina horizon compare --network pubnet' },
      { id: 'scale-workers', label: 'Scale ingestion workers', command: 'lumina workers scale stellar-ingestion --replicas 6' },
    ],
  },
];

const DEFAULT_RUNBOOK = RUNBOOKS[0];

export function listRunbooks(): RunbookDefinition[] {
  return RUNBOOKS.map((runbook) => ({
    ...runbook,
    actions: runbook.actions.map((action) => ({ ...action })),
  }));
}

export function selectRunbook(service: string): RunbookDefinition {
  const normalized = service.trim().toLowerCase();
  return listRunbooks().find((runbook) => runbook.service === normalized) ?? { ...DEFAULT_RUNBOOK, service: normalized || DEFAULT_RUNBOOK.service };
}

export function buildPagerDutyTrigger(signal: IncidentSignal, routingKey: string): PagerDutyTriggerPayload {
  if (!routingKey.trim()) {
    throw new Error('PagerDuty routing key is required');
  }

  const runbook = selectRunbook(signal.service);
  const timestamp = signal.timestamp ?? new Date().toISOString();
  const dedupeKey = signal.dedupeKey ?? `${runbook.service}:${signal.severity}:${signal.summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

  return {
    routing_key: routingKey,
    event_action: 'trigger',
    dedup_key: dedupeKey,
    payload: {
      summary: signal.summary,
      source: signal.source,
      severity: signal.severity,
      timestamp,
      component: runbook.service,
      group: runbook.escalationPolicy,
      class: runbook.id,
      custom_details: {
        ...(signal.details ?? {}),
        runbookId: runbook.id,
        runbookSummary: runbook.summary,
        automatedActions: runbook.actions.map((action) => ({
          id: action.id,
          label: action.label,
          requiresApproval: Boolean(action.requiresApproval || action.destructive),
        })),
      },
    },
    links: [{ href: runbook.dashboardUrl, text: `${runbook.title} dashboard` }],
  };
}
