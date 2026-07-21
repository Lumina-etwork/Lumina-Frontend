import { cacheNetworkState } from "./networkCache";

let periodicInterval: NodeJS.Timeout | null = null;

export function startSyncManager() {
  if (periodicInterval) return;

  // Run periodically every 30s
  periodicInterval = setInterval(() => {
    void cacheNetworkState();
  }, 30000);
}

export function stopSyncManager() {
  if (periodicInterval) {
    clearInterval(periodicInterval);
    periodicInterval = null;
  }
}

/**
 * Call this when a WebSocket disconnection event is detected.
 * It immediately triggers cacheNetworkState() to persist the last good state.
 */
export async function handleWebSocketDisconnect() {
  await cacheNetworkState();
}
