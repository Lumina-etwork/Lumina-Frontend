"use client";

import { useCallback, useState } from "react";

export function TxModal({ txHash }: { txHash?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    const { loadCryptoSDK } = await import("@/app/lib/dynamicImports");
    await loadCryptoSDK();
    setConfirming(false);
    setIsOpen(false);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Details
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Transaction Details
            </h2>
            {txHash && (
              <p className="mb-4 truncate text-sm text-zinc-500 dark:text-zinc-400">
                Hash: {txHash}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {confirming ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
