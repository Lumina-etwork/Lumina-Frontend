"use client";

import { useState, useCallback } from "react";
import { TransactionMonitor } from "./TransactionMonitor";
import { TransactionDetail } from "./TransactionDetail";
import { useBridgeTx } from "@/src/hooks/useBridgeTx";
import type { BridgeTransaction } from "@/src/lib/bridge";

const DEMO_WALLET = "GABCDEF1234567890";

export function BridgeDashboard() {
  const [selectedTx, setSelectedTx] = useState<BridgeTransaction | null>(null);
  const { transactions, isLoading, error, retryTransaction, refetch } = useBridgeTx({
    walletAddress: DEMO_WALLET,
  });

  const handleSelect = useCallback((tx: BridgeTransaction) => {
    setSelectedTx(tx);
  }, []);

  const handleRetry = useCallback(
    (id: string) => {
      retryTransaction(id);
      setSelectedTx(null);
    },
    [retryTransaction],
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedTx(null);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cross-Chain Bridge</h1>
          <p className="mt-1 text-sm text-muted">
            Monitor bridge transactions across Ethereum, Polygon, Arbitrum, and Stellar Soroban.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-text transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-error-border bg-error-bg p-4 text-sm text-danger-text">
          Failed to load bridge transactions. Please try again.
        </div>
      )}

      {selectedTx ? (
        <TransactionDetail
          transaction={selectedTx}
          onRetry={handleRetry}
          onClose={handleCloseDetail}
        />
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Transactions ({transactions.length})
            </h2>
          </div>
          <TransactionMonitor onSelect={handleSelect} onRetry={handleRetry} />
        </div>
      )}
    </div>
  );
}
