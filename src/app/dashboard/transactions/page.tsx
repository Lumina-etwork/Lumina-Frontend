import dynamic from "next/dynamic";

const TxModal = dynamic(
  () => import("@/src/app/components/dashboard/TxModal").then((m) => ({ default: m.TxModal })),
  { loading: () => <div className="h-4 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" /> }
);

const MOCK_TXS = [
  { hash: "0x7a3f...b9c2", type: "Vesting Create", status: "confirmed", amount: "10,000 XLM" },
  { hash: "0x1e5d...f8a1", type: "Stream Start", status: "confirmed", amount: "5,000 XLM" },
  { hash: "0x9b4c...d3e7", type: "Vesting Claim", status: "pending", amount: "2,500 XLM" },
  { hash: "0x2f8a...6c4b", type: "Stream Cancel", status: "confirmed", amount: "1,000 XLM" },
];

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Transactions</h1>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Hash</th>
              <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Type</th>
              <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
              <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
              <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {MOCK_TXS.map((tx) => (
              <tr key={tx.hash} className="bg-white dark:bg-zinc-950">
                <td className="px-4 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-100">
                  {tx.hash}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{tx.type}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{tx.amount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      tx.status === "confirmed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <TxModal txHash={tx.hash} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
