import assert from "node:assert/strict";
import type { BridgeTransaction, BridgeRoute } from "../types";
import { useBridgeStore, STATUS_ORDER } from "../bridgeStore";

let failures = 0;

function run(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`\u2713 ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`\u2717 ${name}`);
    console.error(error);
  }
}

function resetStore(): void {
  useBridgeStore.setState({ transactions: {}, routes: [] });
}

function makeMockTx(overrides: Partial<BridgeTransaction> = {}): BridgeTransaction {
  return {
    id: "tx-1",
    sourceChain: "ethereum",
    destinationChain: "polygon",
    token: "USDC",
    amount: "1000",
    sourceTxHash: "0xabc",
    status: "Initiated",
    currentConfirmations: 0,
    requiredConfirmations: 12,
    initiatedAt: Date.now(),
    estimatedTimeMs: 120_000,
    ...overrides,
  };
}

function makeMockRoute(overrides: Partial<BridgeRoute> = {}): BridgeRoute {
  return {
    id: "route-1",
    sourceChain: "ethereum",
    destinationChain: "polygon",
    estimatedTimeMs: 120_000,
    historicalMedianTimeMs: 110_000,
    feeBps: 5,
    minAmount: "10",
    maxAmount: "100000",
    ...overrides,
  };
}

run("addTransaction stores a transaction", () => {
  resetStore();
  const tx = makeMockTx();
  useBridgeStore.getState().addTransaction(tx);
  const stored = useBridgeStore.getState().getTransaction("tx-1");
  assert.ok(stored);
  assert.equal(stored!.id, "tx-1");
  assert.equal(stored!.status, "Initiated");
});

run("getTransaction returns undefined for missing id", () => {
  resetStore();
  const result = useBridgeStore.getState().getTransaction("nonexistent");
  assert.equal(result, undefined);
});

run("updateStatus changes status and sets timestamp", () => {
  resetStore();
  const tx = makeMockTx({ initiatedAt: 1000 });
  useBridgeStore.getState().addTransaction(tx);
  useBridgeStore.getState().updateStatus("tx-1", "SourceConfirmed");
  const stored = useBridgeStore.getState().getTransaction("tx-1")!;
  assert.equal(stored.status, "SourceConfirmed");
  assert.ok(stored.sourceConfirmedAt);
  assert.ok(typeof stored.sourceConfirmedAt === "number");
});

run("updateStatus applies overrides", () => {
  resetStore();
  const tx = makeMockTx();
  useBridgeStore.getState().addTransaction(tx);
  useBridgeStore.getState().updateStatus("tx-1", "SourceConfirmed", {
    currentConfirmations: 12,
  });
  const stored = useBridgeStore.getState().getTransaction("tx-1")!;
  assert.equal(stored.currentConfirmations, 12);
});

run("advanceStatus progresses through lifecycle", () => {
  resetStore();
  const tx = makeMockTx({ initiatedAt: 1000 });
  useBridgeStore.getState().addTransaction(tx);

  useBridgeStore.getState().advanceStatus("tx-1");
  assert.equal(useBridgeStore.getState().getTransaction("tx-1")!.status, "SourceConfirmed");

  useBridgeStore.getState().advanceStatus("tx-1");
  assert.equal(useBridgeStore.getState().getTransaction("tx-1")!.status, "BridgeRelayed");

  useBridgeStore.getState().advanceStatus("tx-1");
  assert.equal(useBridgeStore.getState().getTransaction("tx-1")!.status, "DestinationPending");

  useBridgeStore.getState().advanceStatus("tx-1");
  assert.equal(useBridgeStore.getState().getTransaction("tx-1")!.status, "DestinationConfirmed");

  useBridgeStore.getState().advanceStatus("tx-1");
  assert.equal(useBridgeStore.getState().getTransaction("tx-1")!.status, "Complete");

  useBridgeStore.getState().advanceStatus("tx-1");
  assert.equal(useBridgeStore.getState().getTransaction("tx-1")!.status, "Complete");
});

run("advanceStatus does nothing on Failed transactions", () => {
  resetStore();
  const tx = makeMockTx({ initiatedAt: 1000 });
  useBridgeStore.getState().addTransaction(tx);
  useBridgeStore.getState().markFailed("tx-1", "Out of gas", "retry");
  useBridgeStore.getState().advanceStatus("tx-1");
  assert.equal(useBridgeStore.getState().getTransaction("tx-1")!.status, "Failed");
});

run("markFailed sets error and action", () => {
  resetStore();
  const tx = makeMockTx();
  useBridgeStore.getState().addTransaction(tx);
  useBridgeStore.getState().markFailed("tx-1", "Insufficient fee", "contact_support");
  const stored = useBridgeStore.getState().getTransaction("tx-1")!;
  assert.equal(stored.status, "Failed");
  assert.equal(stored.errorReason, "Insufficient fee");
  assert.equal(stored.recommendedAction, "contact_support");
  assert.ok(stored.failedAt);
});

run("removeTransaction removes the transaction", () => {
  resetStore();
  const tx = makeMockTx();
  useBridgeStore.getState().addTransaction(tx);
  useBridgeStore.getState().removeTransaction("tx-1");
  assert.equal(useBridgeStore.getState().getTransaction("tx-1"), undefined);
});

run("getTransactionsByStatus filters correctly", () => {
  resetStore();
  useBridgeStore.getState().addTransaction(makeMockTx({ id: "tx-1", status: "Initiated" }));
  useBridgeStore.getState().addTransaction(makeMockTx({ id: "tx-2", status: "Complete" }));
  useBridgeStore.getState().addTransaction(makeMockTx({ id: "tx-3", status: "Initiated" }));

  const initiated = useBridgeStore.getState().getTransactionsByStatus("Initiated");
  assert.equal(initiated.length, 2);
  assert.equal(initiated[0].id, "tx-1");
  assert.equal(initiated[1].id, "tx-3");
});

run("getTransactionsByChain filters by source or destination", () => {
  resetStore();
  useBridgeStore.getState().addTransaction(
    makeMockTx({ id: "tx-1", sourceChain: "ethereum", destinationChain: "polygon" }),
  );
  useBridgeStore.getState().addTransaction(
    makeMockTx({ id: "tx-2", sourceChain: "polygon", destinationChain: "arbitrum" }),
  );

  const ethTxs = useBridgeStore.getState().getTransactionsByChain("ethereum");
  assert.equal(ethTxs.length, 1);
  assert.equal(ethTxs[0].id, "tx-1");

  const polyTxs = useBridgeStore.getState().getTransactionsByChain("polygon");
  assert.equal(polyTxs.length, 2);
});

run("setRoutes stores routes", () => {
  resetStore();
  const route = makeMockRoute();
  useBridgeStore.getState().setRoutes([route]);
  assert.equal(useBridgeStore.getState().routes.length, 1);
  assert.equal(useBridgeStore.getState().routes[0].id, "route-1");
});

run("STATUS_ORDER has correct lifecycle", () => {
  assert.deepEqual(STATUS_ORDER, [
    "Initiated",
    "SourceConfirmed",
    "BridgeRelayed",
    "DestinationPending",
    "DestinationConfirmed",
    "Complete",
  ]);
});

run("addTransaction replaces existing transaction with same id", () => {
  resetStore();
  useBridgeStore.getState().addTransaction(makeMockTx({ id: "tx-1", amount: "100" }));
  useBridgeStore.getState().addTransaction(makeMockTx({ id: "tx-1", amount: "200" }));
  const stored = useBridgeStore.getState().getTransaction("tx-1")!;
  assert.equal(stored.amount, "200");
});

run("updateStatus does nothing for missing transaction", () => {
  resetStore();
  useBridgeStore.getState().updateStatus("nonexistent", "Complete");
  assert.equal(Object.keys(useBridgeStore.getState().transactions).length, 0);
});

run("markFailed does nothing for missing transaction", () => {
  resetStore();
  useBridgeStore.getState().markFailed("nonexistent", "error", "retry");
  assert.equal(Object.keys(useBridgeStore.getState().transactions).length, 0);
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}

console.log("\nAll bridge store tests passed");
