import "fake-indexeddb/auto";
import { processNetworkEvent, getInMemoryState } from "../../../hooks/useNetworkState";
import { cacheNetworkState, capturedSnapshots, clearCache } from "../networkCache";

interface FailedTest {
  name: string;
  reason: string;
}

const failures: FailedTest[] = [];

function assert<T>(name: string, expected: T, actual: T) {
  const ok =
    JSON.stringify(expected) === JSON.stringify(actual) ||
    expected === (actual as unknown);
  if (!ok) {
    failures.push({
      name,
      reason: `expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
    });
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

async function run() {
  console.log("Running networkCache stress and consistency tests...");
  
  await clearCache();
  
  // Initialize state with disconnected nodes
  const state = getInMemoryState();
  // Clear any previous nodes
  state.nodes = {};
  for (let i = 0; i < 100; i++) {
    state.nodes[`node-${i}`] = {
      id: `node-${i}`,
      status: "disconnected",
      bandwidth_usage: 0,
      lastUpdated: Date.now(),
    };
  }
  
  // We fire 100 state mutations (events) within 50ms with random delays
  const mutationPromises: Promise<void>[] = [];
  
  // Simultaneously trigger cacheNetworkState() periodically (every 2ms)
  const cachePromises: Promise<boolean>[] = [];
  const intervalId = setInterval(() => {
    cachePromises.push(cacheNetworkState());
  }, 2);
  
  for (let i = 0; i < 100; i++) {
    const delay = Math.floor(Math.random() * 30); // Random delay within 30ms range
    const nodeId = `node-${i}`;
    const bandwidth = 100 + i;
    
    mutationPromises.push(
      new Promise<void>((resolve) => {
        setTimeout(async () => {
          await processNetworkEvent({
            nodeId,
            status: "connected",
            bandwidth_usage: bandwidth,
          });
          resolve();
        }, delay);
      })
    );
  }
  
  // Wait for all mutations to finish
  await Promise.all(mutationPromises);
  
  // Stop periodic caching
  clearInterval(intervalId);
  
  // Wait for all active caching operations to settle
  await Promise.all(cachePromises);
  
  console.log(`Fired 100 mutations. Captured ${capturedSnapshots.length} successful cache snapshots.`);
  
  // Verify that all captured snapshots represent a temporally consistent state
  assert("Captured at least one snapshot", true, capturedSnapshots.length > 0);
  
  let consistencyViolations = 0;
  
  for (let idx = 0; idx < capturedSnapshots.length; idx++) {
    const snapshot = capturedSnapshots[idx];
    const nodeKeys = Object.keys(snapshot.nodes);
    
    for (const key of nodeKeys) {
      const node = snapshot.nodes[key];
      const nodeIndex = parseInt(node.id.split("-")[1], 10);
      
      // Invariant check:
      // If status is 'connected', bandwidth_usage MUST be 100 + nodeIndex.
      // If status is 'disconnected', bandwidth_usage MUST be 0.
      if (node.status === "connected") {
        if (node.bandwidth_usage !== 100 + nodeIndex) {
          consistencyViolations++;
          console.error(
            `Inconsistent snapshot at index ${idx}: node ${node.id} is 'connected' but has stale/partial bandwidth_usage ${node.bandwidth_usage} (expected ${100 + nodeIndex})`
          );
        }
      } else if (node.status === "disconnected") {
        if (node.bandwidth_usage !== 0) {
          consistencyViolations++;
          console.error(
            `Inconsistent snapshot at index ${idx}: node ${node.id} is 'disconnected' but has partial bandwidth_usage ${node.bandwidth_usage} (expected 0)`
          );
        }
      }
    }
  }
  
  assert("Zero consistency violations during concurrent stress", 0, consistencyViolations);
  
  if (failures.length > 0) {
    console.error(`\n${failures.length} test failure(s):`);
    for (const f of failures) console.error(` - ${f.name}: ${f.reason}`);
    process.exit(1);
  }
  
  console.log("\nAll networkCache consistency assertions passed successfully.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
