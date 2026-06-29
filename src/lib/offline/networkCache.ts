import { openDB } from "idb";
import { getInMemoryState, getStateVersion, NetworkState } from "../../hooks/useNetworkState";

const DB_NAME = "lumina-network-state-db";
const STORE_NAME = "network-topology";

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

// Global log of captured snapshots for stress test verification
export const capturedSnapshots: NetworkState[] = [];

// Deep clone helper that yields to allow other events to execute, simulating a large state copy
export async function snapshotStateAsync(state: NetworkState): Promise<NetworkState> {
  const clonedNodes: typeof state.nodes = {};
  const keys = Object.keys(state.nodes);
  
  for (const key of keys) {
    clonedNodes[key] = { ...state.nodes[key] };
    // Yield to the event loop
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  
  return {
    nodes: clonedNodes,
    connections: state.connections.map((c) => ({ ...c })),
  };
}

export async function cacheNetworkState(): Promise<boolean> {
  const startVersion = getStateVersion();
  const state = getInMemoryState();
  
  // Take snapshot asynchronously
  const snapshot = await snapshotStateAsync(state);
  
  const endVersion = getStateVersion();
  if (startVersion !== endVersion) {
    // Snapshot is inconsistent due to concurrent updates, retry after 10ms
    await new Promise((resolve) => setTimeout(resolve, 10));
    return cacheNetworkState();
  }
  
  // Save consistent snapshot to DB
  try {
    const db = await getDB();
    await db.put(STORE_NAME, snapshot, "latest");
    capturedSnapshots.push(snapshot); // Save for stress test assertions
    return true;
  } catch (error) {
    console.error("Failed to write network state cache to IndexedDB", error);
    return false;
  }
}

export async function getCachedNetworkState(): Promise<NetworkState | null> {
  try {
    const db = await getDB();
    return (await db.get(STORE_NAME, "latest")) || null;
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
    capturedSnapshots.length = 0;
  } catch (error) {
    console.error("Failed to clear network state cache", error);
  }
}
