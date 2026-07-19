"use client";

/**
 * src/pages/history/PaymentHistory.tsx
 *
 * Payment history table view for a Stellar account.
 * Uses useHorizonPagination for cursor-based pagination and displays
 * Previous / Next controls alongside the PageJumpInput component.
 *
 * Usage (Next.js app router page or standalone):
 *   <PaymentHistory accountId="GABC..." />
 */

import React from "react";
import { useHorizonPagination } from "@/src/hooks/useHorizonPagination";
import { PageJumpInput } from "@/src/components/history/PageJumpInput";
import type { HorizonPaymentRecord } from "@/src/lib/horizon/horizonClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentHistoryProps {
  accountId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatAmount(record: HorizonPaymentRecord): string {
  const amount = record.amount ?? record.starting_balance ?? "—";
  if (amount === "—") return amount;
  return parseFloat(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

function formatAsset(record: HorizonPaymentRecord): string {
  if (record.asset_type === "native") return "XLM";
  if (record.asset_code) return record.asset_code;
  return "—";
}

function formatCounterparty(record: HorizonPaymentRecord): string {
  const raw = record.from ?? record.funder ?? record.to ?? record.account ?? "";
  if (!raw) return "—";
  return `${raw.slice(0, 6)}…${raw.slice(-6)}`;
}

function humanType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
  return (
    <tr className="ph-skeleton-row" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, ci) => (
        <td key={ci} className="ph-td">
          <div
            className="ph-skeleton-cell"
            style={{ width: `${55 + ((index * 7 + ci * 13) % 35)}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Record row ───────────────────────────────────────────────────────────────

function RecordRow({
  record,
  rowIndex,
}: {
  record: HorizonPaymentRecord;
  rowIndex: number;
}) {
  return (
    <tr
      className="ph-record-row"
      style={{ animationDelay: `${rowIndex * 35}ms` }}
    >
      <td className="ph-td ph-td--date">{formatDate(record.created_at)}</td>
      <td className="ph-td ph-td--type">
        <span className={`ph-type-badge ph-type-badge--${record.type}`}>
          {humanType(record.type)}
        </span>
      </td>
      <td className="ph-td ph-td--amount ph-td--mono">{formatAmount(record)}</td>
      <td className="ph-td ph-td--asset">{formatAsset(record)}</td>
      <td className="ph-td ph-td--counterparty ph-td--mono">
        {formatCounterparty(record)}
      </td>
      <td className="ph-td ph-td--memo">
        {record.memo ?? <span className="ph-empty">—</span>}
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PaymentHistory({ accountId }: PaymentHistoryProps) {
  const {
    records,
    pageIndex,
    totalCachedPages,
    loading,
    error,
    warning,
    nextPage,
    prevPage,
    goToPage,
  } = useHorizonPagination(accountId, { limit: 50 });

  const hasPrev = pageIndex > 0;
  const hasNext = records.length === 50; // Horizon returns < limit on the last page

  return (
    <section className="ph-container" aria-label="Payment History">
      {/* ── Header ── */}
      <div className="ph-header">
        <div className="ph-header-text">
          <h1 className="ph-title">Payment History</h1>
          <p className="ph-subtitle">
            {accountId.slice(0, 8)}…{accountId.slice(-8)}
          </p>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="ph-error-banner" role="alert" aria-live="assertive">
          <span className="ph-error-icon" aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="ph-table-wrapper">
        <table className="ph-table" aria-label="Payment records">
          <thead>
            <tr>
              <th className="ph-th" scope="col">Date</th>
              <th className="ph-th" scope="col">Type</th>
              <th className="ph-th" scope="col">Amount</th>
              <th className="ph-th" scope="col">Asset</th>
              <th className="ph-th" scope="col">Counterparty</th>
              <th className="ph-th" scope="col">Memo</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <SkeletonRow key={i} index={i} />
                ))
              : records.map((r, i) => (
                  <RecordRow key={r.id} record={r} rowIndex={i} />
                ))}
            {!loading && records.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="ph-empty-state">
                  No payment records found for this account.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination toolbar ── */}
      <div className="ph-toolbar" aria-label="Pagination controls">
        {/* Previous / page info / Next */}
        <div className="ph-nav-group">
          <button
            id="ph-prev-btn"
            type="button"
            className="ph-nav-btn"
            onClick={prevPage}
            disabled={!hasPrev || loading}
            aria-label="Previous page"
          >
            ← Previous
          </button>

          <span className="ph-page-info" aria-live="polite" aria-atomic="true">
            Page <strong>{pageIndex + 1}</strong>
            {totalCachedPages > 0 && (
              <span className="ph-cached-badge" title="Cached pages">
                {totalCachedPages} cached
              </span>
            )}
          </span>

          <button
            id="ph-next-btn"
            type="button"
            className="ph-nav-btn"
            onClick={nextPage}
            disabled={!hasNext || loading}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>

        {/* Direct page jump */}
        <PageJumpInput
          currentPage={pageIndex}
          totalCachedPages={totalCachedPages}
          loading={loading}
          warning={warning}
          onGoToPage={goToPage}
        />
      </div>

      <style>{`
        /* ── Container ───────────────────────────────────────────── */
        .ph-container {
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          background: var(--color-bg, #0f1624);
          color: var(--color-text, #e2e8f0);
          border-radius: 16px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.4);
        }

        /* ── Header ─────────────────────────────────────────────── */
        .ph-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .ph-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ph-subtitle {
          margin: 4px 0 0;
          font-size: 0.8rem;
          color: var(--color-text-secondary, #718096);
          font-family: 'JetBrains Mono', monospace, monospace;
        }

        /* ── Error banner ────────────────────────────────────────── */
        .ph-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          background: rgba(229, 62, 62, 0.12);
          border: 1px solid rgba(229, 62, 62, 0.35);
          color: #fc8181;
          font-size: 0.875rem;
        }

        .ph-error-icon {
          font-size: 1rem;
        }

        /* ── Table wrapper ───────────────────────────────────────── */
        .ph-table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--color-border, #1e2d45);
        }

        .ph-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .ph-th {
          padding: 12px 16px;
          text-align: left;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--color-text-secondary, #718096);
          background: rgba(255,255,255,0.025);
          border-bottom: 1px solid var(--color-border, #1e2d45);
          white-space: nowrap;
        }

        .ph-td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          vertical-align: middle;
          white-space: nowrap;
        }

        .ph-td--mono {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }

        .ph-td--date  { color: var(--color-text-secondary, #718096); font-size: 0.8rem; }
        .ph-td--amount { font-weight: 600; color: #68d391; }
        .ph-td--asset { color: #63b3ed; font-weight: 600; }
        .ph-td--counterparty { color: #fbd38d; }

        /* ── Record row animation ────────────────────────────────── */
        .ph-record-row {
          animation: ph-fade-in 0.25s ease both;
          transition: background 0.12s ease;
        }

        .ph-record-row:hover {
          background: rgba(255,255,255,0.04);
        }

        @keyframes ph-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Type badge ──────────────────────────────────────────── */
        .ph-type-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          background: rgba(108, 99, 255, 0.15);
          color: #a78bfa;
          border: 1px solid rgba(108, 99, 255, 0.25);
          white-space: nowrap;
        }

        .ph-type-badge--payment {
          background: rgba(99, 179, 237, 0.1);
          color: #63b3ed;
          border-color: rgba(99, 179, 237, 0.2);
        }

        .ph-type-badge--create_account {
          background: rgba(104, 211, 145, 0.1);
          color: #68d391;
          border-color: rgba(104, 211, 145, 0.2);
        }

        /* ── Skeleton rows ───────────────────────────────────────── */
        .ph-skeleton-row .ph-td {
          padding: 14px 16px;
        }

        .ph-skeleton-cell {
          height: 14px;
          border-radius: 6px;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.09) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 200% 100%;
          animation: ph-shimmer 1.4s ease-in-out infinite;
        }

        @keyframes ph-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Empty state ─────────────────────────────────────────── */
        .ph-empty-state {
          padding: 40px;
          text-align: center;
          color: var(--color-text-secondary, #718096);
          font-size: 0.9rem;
        }

        .ph-empty {
          color: var(--color-text-secondary, #4a5568);
        }

        /* ── Pagination toolbar ──────────────────────────────────── */
        .ph-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          padding: 4px 0;
        }

        .ph-nav-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ph-nav-btn {
          padding: 8px 18px;
          border-radius: 10px;
          border: 1px solid var(--color-border, #2d3748);
          background: rgba(255,255,255,0.04);
          color: var(--color-text, #e2e8f0);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }

        .ph-nav-btn:hover:not(:disabled) {
          background: rgba(108, 99, 255, 0.15);
          border-color: rgba(108, 99, 255, 0.4);
        }

        .ph-nav-btn:active:not(:disabled) {
          transform: scale(0.97);
        }

        .ph-nav-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .ph-page-info {
          font-size: 0.875rem;
          color: var(--color-text-secondary, #a0aec0);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ph-page-info strong {
          color: var(--color-text, #e2e8f0);
        }

        .ph-cached-badge {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(104, 211, 145, 0.1);
          color: #68d391;
          border: 1px solid rgba(104, 211, 145, 0.2);
          font-weight: 600;
        }
      `}</style>
    </section>
  );
}
