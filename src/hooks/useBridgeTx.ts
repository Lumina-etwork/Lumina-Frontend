"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBridgeStore } from "@/src/lib/bridge";
import type { BridgeTransaction, BridgeStatus } from "@/src/lib/bridge";

interface UseBridgeTxOptions {
  walletAddress?: string
  pollIntervalMs?: number
}

function sendPushNotification(tx: BridgeTransaction, status: BridgeStatus): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const title = status === "Complete"
    ? "Bridge Transaction Complete"
    : "Bridge Transaction Failed";

  const body = status === "Complete"
    ? `${tx.amount} ${tx.token} bridged from ${tx.sourceChain} to ${tx.destinationChain}`
    : `${tx.token} bridge failed: ${tx.errorReason ?? "Unknown error"}`;

  new Notification(title, { body, icon: "/icons/icon-192x192.png" });
}

function checkAndNotify(prev: BridgeTransaction | undefined, current: BridgeTransaction): void {
  if (!prev) return;
  const terminal: BridgeStatus[] = ["Complete", "Failed"];
  if (prev.status !== current.status && terminal.includes(current.status)) {
    sendPushNotification(current, current.status);
  }
}

export function useBridgeTx({ walletAddress, pollIntervalMs = 10_000 }: UseBridgeTxOptions = {}) {
  const addTransaction = useBridgeStore((s) => s.addTransaction);
  const updateStatus = useBridgeStore((s) => s.updateStatus);
  const transactions = useBridgeStore((s) => s.transactions);
  const prevRef = useRef<Record<string, BridgeTransaction>>({});

  const { data: fetchedTxs, isLoading, error, refetch } = useQuery({
    queryKey: ["bridgeTx", walletAddress],
    queryFn: async (): Promise<BridgeTransaction[]> => {
      await new Promise((r) => setTimeout(r, 500));
      return [];
    },
    enabled: !!walletAddress,
    refetchInterval: pollIntervalMs,
    staleTime: pollIntervalMs,
  });

  useEffect(() => {
    if (!fetchedTxs) return;
    for (const tx of fetchedTxs) {
      const existing = prevRef.current[tx.id];
      checkAndNotify(existing, tx);
      addTransaction(tx);
    }
    prevRef.current = { ...transactions };
  }, [fetchedTxs, addTransaction, transactions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const retryTransaction = useCallback(
    async (id: string): Promise<void> => {
      updateStatus(id, "Initiated", {
        errorReason: undefined,
        recommendedAction: undefined,
        failedAt: undefined,
        currentConfirmations: 0,
      });
    },
    [updateStatus],
  );

  return {
    transactions: Object.values(transactions),
    isLoading,
    error,
    retryTransaction,
    refetch,
  };
}
