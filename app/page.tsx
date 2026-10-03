'use client';

import { useEffect, useMemo, useState } from 'react';
import AssetCard from '@/components/AssetCard';
import EscrowCard from '@/components/EscrowCard';
import FrameFeed from '@/components/FrameFeed';
import { formatAmount, getAssets, getEscrows, getHealth } from '@/lib/api';
import { useStream } from '@/lib/stream';
import type {
  Asset,
  Escrow,
  EscrowCreatedData,
  Health,
  IpAnchorData,
  MilestoneReleasedData,
} from '@/lib/types';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { frames } = useStream();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [nextAssets, nextEscrows, nextHealth] = await Promise.all([
          getAssets(),
          getEscrows(),
          getHealth(),
        ]);
        if (cancelled) return;
        setAssets(nextAssets);
        setEscrows(nextEscrows);
        setHealth(nextHealth);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to reach the indexer');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    // The indexer ingests new ledgers continuously; poll as a safety net for
    // events that may predate this browser session's stream.
    const poll = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  const mergedAssets = useMemo(() => {
    const byId = new Map<number, Asset>();
    for (const asset of assets) byId.set(asset.onchain_id, asset);
    for (const frame of frames) {
      if (frame.type === 'IP_ANCHOR') {
        const data = frame.data as IpAnchorData;
        if (!byId.has(data.asset_id)) {
          byId.set(data.asset_id, {
            onchain_id: data.asset_id,
            creator: data.creator,
            fingerprint: data.fingerprint,
            metadata_uri: null,
            licensing_fee: null,
            timestamp: data.timestamp,
          });
        }
      }
    }
    return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
  }, [assets, frames]);

  const mergedEscrows = useMemo(() => {
    const byId = new Map<number, Escrow>();
    for (const escrow of escrows) byId.set(escrow.onchain_id, escrow);

    // Frames arrive newest-first; replay oldest-first so later state wins.
    for (const frame of [...frames].reverse()) {
      if (frame.type === 'ESCROW_CREATED') {
        const data = frame.data as EscrowCreatedData;
        if (!byId.has(data.escrow_id)) {
          byId.set(data.escrow_id, {
            onchain_id: data.escrow_id,
            client: data.client,
            creator: data.creator,
            total_amount: data.total_amount,
            remaining_balance: data.total_amount,
            completed_milestones: 0,
            total_milestones: data.total_milestones,
            status: 'active',
          });
        }
      } else if (frame.type === 'MILESTONE_RELEASED') {
        const data = frame.data as MilestoneReleasedData;
        const existing = byId.get(data.escrow_id);
        if (existing) {
          byId.set(data.escrow_id, {
            ...existing,
            remaining_balance: (
              BigInt(existing.remaining_balance) - BigInt(data.payout_amount)
            ).toString(),
            completed_milestones: data.completed_milestones,
            status: data.status,
          });
        }
      }
    }

    return [...byId.values()].sort((a, b) => b.onchain_id - a.onchain_id);
  }, [escrows, frames]);

  const totalLocked = useMemo(
    () =>
      mergedEscrows.reduce((sum, escrow) => sum + BigInt(escrow.remaining_balance), 0n).toString(),
    [mergedEscrows],
  );
  const settled = mergedEscrows.filter((escrow) => escrow.status === 'settled').length;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Creator IP, anchored on-chain</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Every fingerprint below is a SHA-256 hash written by the Soroban contract. Lumina stores
          authorship proofs, never the underlying work or the creator&apos;s identity.
        </p>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}. Is the indexer running at{' '}
          <code className="font-mono">{process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000'}</code>?
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Anchored assets" value={mergedAssets.length} />
        <Stat label="Escrows" value={mergedEscrows.length} />
        <Stat label="Settled" value={settled} />
        <Stat label="In escrow" value={formatAmount(totalLocked)} />
      </section>

      <FrameFeed />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          IP assets
        </h2>
        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : mergedAssets.length === 0 ? (
          <p className="text-sm text-slate-600">No anchored assets yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mergedAssets.map((asset) => (
              <AssetCard key={asset.onchain_id} asset={asset} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Milestone escrows
        </h2>
        {mergedEscrows.length === 0 ? (
          <p className="text-sm text-slate-600">No escrows yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mergedEscrows.map((escrow) => (
              <EscrowCard key={escrow.onchain_id} escrow={escrow} />
            ))}
          </div>
        )}
      </section>

      {health && (
        <section className="rounded-xl border border-ink-800 bg-ink-900/40 p-4 text-xs text-slate-500">
          <p>
            Contract <span className="font-mono text-slate-400">{health.contract_id}</span> · indexer
            uptime {(health.uptime_ms / 1000).toFixed(0)}s
          </p>
        </section>
      )}
    </div>
  );
}
