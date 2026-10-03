import { truncateAddress } from '@/lib/api';
import type { Asset } from '@/lib/types';

export default function AssetCard({ asset }: { asset: Asset }) {
  return (
    <article className="rounded-xl border border-ink-800 bg-ink-900/60 p-4 transition hover:border-ink-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-aurora-400">
          Asset #{asset.onchain_id}
        </span>
        <span className="font-mono text-xs text-slate-500">
          {new Date(asset.timestamp * 1000).toLocaleString()}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-300">
        Creator <span className="font-mono text-slate-100">{truncateAddress(asset.creator)}</span>
      </p>

      <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-slate-500">
        {asset.fingerprint}
      </p>

      <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-600">
        SHA-256 authorship fingerprint
      </p>
    </article>
  );
}
