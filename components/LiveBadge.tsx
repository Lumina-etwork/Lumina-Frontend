'use client';

import { useStream } from '@/lib/stream';

const STYLES: Record<string, { dot: string; label: string }> = {
  live: { dot: 'bg-emerald-400', label: 'live' },
  connecting: { dot: 'bg-amber-400 animate-pulse', label: 'connecting' },
  offline: { dot: 'bg-rose-500', label: 'offline' },
};

export default function LiveBadge() {
  const { status } = useStream();
  const style = STYLES[status] ?? STYLES.offline;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1 text-xs font-medium text-slate-300">
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      stream {style.label}
    </span>
  );
}
