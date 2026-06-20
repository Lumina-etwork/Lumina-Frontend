"use client";

import { useCallback, useState } from "react";

interface WalletState {
  address: string;
  balance: string;
}

export function WalletConnector() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { loadCryptoSDK } = await import(
        /* webpackChunkName: "vendors-crypto" */ "@/app/lib/dynamicImports"
      );
      const stellarSdk = await loadCryptoSDK();
      const Horizon = stellarSdk.Horizon ?? stellarSdk.default?.Horizon;

      if (!Horizon?.Server) {
        throw new Error("Failed to load Stellar SDK");
      }

      const server = new Horizon.Server("https://horizon-testnet.stellar.org");
      const account = await server.loadAccount("GABCDEF1234567890EXAMPLE");
      setWallet({
        address: account.id,
        balance: account.balances[0]?.balance ?? "0",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
  }, []);

  if (wallet) {
    return (
      <div className="inline-flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-700">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {Number(wallet.balance).toFixed(2)} XLM
        </span>
        <button
          onClick={disconnect}
          className="ml-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        onClick={connect}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
