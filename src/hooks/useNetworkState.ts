"use client";

import { useState, useEffect } from "react";

export interface NodeState {
  id: string;
  status: "connected" | "disconnected";
  bandwidth_usage: number;
  lastUpdated: number;
}

export interface NetworkState {
  nodes: Record<string, NodeState>;
  connections: Array<{
    id: string;
    source: string;
    target: string;
    status: "active" | "inactive";
  }>;
}

export const inMemoryState: NetworkState = {
  nodes: {},
  connections: [],
};

export let stateVersion = 0;

export function incrementStateVersion() {
  stateVersion++;
}

export function getInMemoryState(): NetworkState {
  return inMemoryState;
}

export function getStateVersion(): number {
  return stateVersion;
}

const listeners = new Set<() => void>();

export function subscribeToState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((l) => l());
}

export async function processNetworkEvent(event: {
  nodeId: string;
  status: "connected" | "disconnected";
  bandwidth_usage: number;
}) {
  // Start transaction
  stateVersion++;

  if (!inMemoryState.nodes[event.nodeId]) {
    inMemoryState.nodes[event.nodeId] = {
      id: event.nodeId,
      status: "disconnected",
      bandwidth_usage: 0,
      lastUpdated: Date.now(),
    };
  }

  // Step 1: Update status (Half-processed state)
  inMemoryState.nodes[event.nodeId].status = event.status;
  inMemoryState.nodes[event.nodeId].lastUpdated = Date.now();
  notifyListeners();

  // Yield the event loop to simulate parsing or network processing delay
  await new Promise((resolve) => setTimeout(resolve, 5));

  // Step 2: Update bandwidth (Consistent state restored)
  inMemoryState.nodes[event.nodeId].bandwidth_usage = event.bandwidth_usage;
  stateVersion++;
  notifyListeners();
}

export function useNetworkState() {
  const [state, setState] = useState<NetworkState>(inMemoryState);

  useEffect(() => {
    return subscribeToState(() => {
      setState({
        nodes: { ...inMemoryState.nodes },
        connections: [...inMemoryState.connections],
      });
    });
  }, []);

  return state;
}
