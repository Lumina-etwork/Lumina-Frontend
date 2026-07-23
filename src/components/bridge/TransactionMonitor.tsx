"use client";

import { useBridgeStore } from "@/src/lib/bridge";
import type { BridgeTransaction, BridgeStatus } from "@/src/lib/bridge";

const STATUS_STEPS: BridgeStatus[] = [
  "Initiated",
  "SourceConfirmed",
  "BridgeRelayed",
  "DestinationPending",
  "DestinationConfirmed",
  "Complete",
];

function StatusStepper({ status }: { status: BridgeStatus }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  const isFailed = status === "Failed";

  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((step, idx) => {
        const isCompleted = idx <= currentIdx && !isFailed;
        const isCurrent = idx === currentIdx && !isFailed;

        return (
          <div key={step} className="flex items-center">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                isCompleted
                  ? "bg-primary text-primary-text"
                  : isCurrent
                    ? "border-2 border-primary bg-surface text-primary"
                    : "border border-border bg-surface text-muted"
              }`}
            >
              {isCompleted ? "\u2713" : idx + 1}
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div
                className={`mx-0.5 h-0.5 w-4 ${
                  idx < currentIdx && !isFailed ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EstimatedTimeColumn({ tx }: { tx: BridgeTransaction }) {
  const elapsed = Date.now() - tx.initiatedAt;
  const progress = Math.min((elapsed / tx.estimatedTimeMs) * 100, 100);

  return (
    <div className="w-32">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-progress-bg">
        <div
          className="h-full rounded-full bg-progress-fill transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        {tx.actualTimeMs
          ? `${(tx.actualTimeMs / 1000).toFixed(0)}s`
          : `${((tx.estimatedTimeMs - elapsed) / 1000).toFixed(0)}s est.`}
      </p>
    </div>
  );
}

function FailureRow({ tx, onRetry }: { tx: BridgeTransaction; onRetry?: (id: string) => void }) {
  if (tx.status !== "Failed") return null;

  return (
    <div className="mt-2 rounded-md border border-error-border bg-error-bg p-3">
      <p className="text-sm font-medium text-danger-text">{tx.errorReason}</p>
      {tx.recommendedAction === "retry" && onRetry && (
        <button
          onClick={() => onRetry(tx.id)}
          className="mt-2 rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-text transition hover:bg-primary-hover"
        >
          Retry
        </button>
      )}
      {tx.recommendedAction === "contact_support" && (
        <p className="mt-1 text-xs text-muted">Contact support to resolve this issue.</p>
      )}
    </div>
  );
}

interface TransactionMonitorProps {
  onSelect?: (tx: BridgeTransaction) => void
  onRetry?: (id: string) => void
}

export function TransactionMonitor({ onSelect, onRetry }: TransactionMonitorProps) {
  const transactions = useBridgeStore((s) => s.transactions);
  const txs = Object.values(transactions);

  if (txs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
        No bridge transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Transaction</th>
            <th className="px-4 py-3">Route</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Estimated Time</th>
            <th className="px-4 py-3">Confirmations</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((tx) => (
            <tr
              key={tx.id}
              className="cursor-pointer border-b border-border transition hover:bg-surface-alt"
              onClick={() => onSelect?.(tx)}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">
                  {tx.amount} {tx.token}
                </p>
                <p className="text-xs text-muted">{tx.sourceTxHash.slice(0, 10)}...</p>
              </td>
              <td className="px-4 py-3">
                <span className="text-foreground">{tx.sourceChain.toUpperCase()}</span>
                <span className="mx-1 text-muted">&rarr;</span>
                <span className="text-foreground">{tx.destinationChain.toUpperCase()}</span>
              </td>
              <td className="px-4 py-3">
                <StatusStepper status={tx.status} />
                <FailureRow tx={tx} onRetry={onRetry} />
              </td>
              <td className="px-4 py-3">
                <EstimatedTimeColumn tx={tx} />
              </td>
              <td className="px-4 py-3">
                <span className="text-foreground">
                  {tx.currentConfirmations}/{tx.requiredConfirmations}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
