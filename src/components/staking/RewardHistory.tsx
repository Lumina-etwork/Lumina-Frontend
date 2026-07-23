"use client";

import { useCallback, useEffect, useState } from "react"
import type { RewardHistoryPage, RewardRecord } from "@/src/lib/staking/types"

interface RewardHistoryProps {
  fetchPage: (page: number, pageSize: number) => Promise<RewardHistoryPage>
  loading: boolean
}

export function RewardHistory({ fetchPage, loading }: RewardHistoryProps) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<RewardHistoryPage | null>(null)
  const pageSize = 10

  const load = useCallback(async () => {
    const result = await fetchPage(page, pageSize)
    setData(result)
  }, [fetchPage, page])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = data ? Math.ceil(data.totalRecords / pageSize) : 0

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="border-b border-table-divider px-5 py-4">
        <h3 className="text-base font-semibold text-foreground">Reward History</h3>
      </div>

      {loading && !data ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-surface-alt" />
          ))}
        </div>
      ) : data && data.records.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-table-header-bg text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((record: RewardRecord) => (
                  <tr key={record.id} className="border-t border-table-divider">
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          record.type === "stake"
                            ? "bg-tag-bg text-tag-text"
                            : record.type === "reward"
                              ? "bg-status-healthy/10 text-status-healthy"
                              : "bg-danger/10 text-danger"
                        }`}
                      >
                        {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium tabular-nums text-foreground">
                      {(Number(record.amount) / 1e7).toLocaleString()} LUM
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${record.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:text-primary-hover hover:underline"
                      >
                        {record.txHash.slice(0, 8)}...
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-table-divider px-5 py-3">
            <p className="text-xs text-muted">
              Page {page} of {totalPages || 1}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-sm text-muted">
          <p>No reward history yet.</p>
          <p className="mt-1 text-xs">Start staking to earn rewards.</p>
        </div>
      )}
    </div>
  )
}
