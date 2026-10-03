'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { streamUrl } from './api';
import type { StreamFrame, StreamStatus } from './types';

interface StreamState {
  status: StreamStatus;
  frames: StreamFrame[];
  clear: () => void;
}

const StreamContext = createContext<StreamState>({
  status: 'connecting',
  frames: [],
  clear: () => {},
});

const MAX_FRAMES = 50;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8000;

/**
 * Single reconnecting WebSocket shared by every page. Mirrors the backend's
 * `/stream` frames newest-first and drops the oldest beyond `MAX_FRAMES`.
 */
export function StreamProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [frames, setFrames] = useState<StreamFrame[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;

    const schedule = () => {
      if (closedRef.current) return;
      const delay = Math.min(BASE_DELAY_MS * 2 ** attemptRef.current, MAX_DELAY_MS);
      attemptRef.current += 1;
      timerRef.current = setTimeout(connect, delay);
    };

    const connect = () => {
      if (closedRef.current) return;
      setStatus('connecting');

      let socket: WebSocket;
      try {
        socket = new WebSocket(streamUrl());
      } catch {
        schedule();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        attemptRef.current = 0;
        setStatus('live');
      };

      socket.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data as string) as StreamFrame;
          setFrames((prev) => [frame, ...prev].slice(0, MAX_FRAMES));
        } catch {
          // Ignore frames we cannot parse rather than tearing down the socket.
        }
      };

      socket.onclose = () => {
        setStatus('offline');
        schedule();
      };

      socket.onerror = () => socket.close();
    };

    connect();

    return () => {
      closedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      socketRef.current?.close();
    };
  }, []);

  const clear = useCallback(() => setFrames([]), []);

  return (
    <StreamContext.Provider value={{ status, frames, clear }}>{children}</StreamContext.Provider>
  );
}

export function useStream(): StreamState {
  return useContext(StreamContext);
}
