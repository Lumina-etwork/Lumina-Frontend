'use client';

import { useStream } from '@/lib/stream';
import { truncateAddress } from '@/lib/api';
import type {
  EscrowCreatedData,
  IpAnchorData,
  MilestoneReleasedData,
  StreamFrame,
} from '@/lib/types';

const TYPE_STYLES: Record<string, string> = {
  IP_ANCHOR: 'text-aurora-300 border-aurora-500/40 bg-aurora-500/10',
  ESCROW_CREATED: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
  MILESTONE_RELEASED: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
};

function summarize(frame: StreamFrame): string {
  switch (frame.type) {
    case 'IP_ANCHOR': {
      const d = frame.data as IpAnchorData;
      return `asset #${d.asset_id} by ${truncateAddress(d.creator, 4)}`;
    }
    case 'ESCROW_CREATED': {
      const d = frame.data as EscrowCreatedData;
      return `escrow #${d.escrow_id} · ${d.total_milestones} milestones`;
    }
    case 'MILESTONE_RELEASED': {
      const d = frame.data as MilestoneReleasedData;
      return `escrow #${d.escrow_id} · milestone ${d.completed_milestones} (${d.status})`;
    }
    default:
      return '';
  }
}

export default function FrameFeed() {
  const { frames, status, clear } = useStream();

  return (
    <section className="rounded-xl border border-ink-800 bg-ink-900/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Live feed</h2>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-600">{status}</span>
          {frames.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {frames.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Waiting for on-chain events…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {frames.map((frame, index) => (
            <li
              key={`${frame.type}-${index}-${JSON.stringify(frame.data).slice(0, 24)}`}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  TYPE_STYLES[frame.type] ?? 'border-ink-700 bg-ink-800 text-slate-400'
                }`}
              >
                {frame.type}
              </span>
              <span className="truncate text-slate-400">{summarize(frame)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
