import { formatAmount, truncateAddress } from '@/lib/api';
import type { Escrow } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  settled: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export default function EscrowCard({ escrow }: { escrow: Escrow }) {
  const total = Number(escrow.total_milestones) || 1;
  const done = Math.min(Number(escrow.completed_milestones), total);
  const progress = Math.round((done / total) * 100);
  const statusClass = STATUS_STYLES[escrow.status] ?? STATUS_STYLES.active;

  return (
    <article className="rounded-xl border border-ink-800 bg-ink-900/60 p-4 transition hover:border-ink-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Escrow #{escrow.onchain_id}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
          {escrow.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-600">Client</p>
          <p className="font-mono text-slate-200">{truncateAddress(escrow.client)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-600">Creator</p>
          <p className="font-mono text-slate-200">{truncateAddress(escrow.creator)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-600">Total</p>
          <p className="text-slate-200">{formatAmount(escrow.total_amount)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-600">Remaining</p>
          <p className="text-slate-200">{formatAmount(escrow.remaining_balance)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Milestones {done}/{total}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800">
          <div className="h-full rounded-full bg-aurora-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </article>
  );
}
