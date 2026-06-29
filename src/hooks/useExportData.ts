import { useState, useRef, useCallback } from 'react';

type ExportStatus = 'idle' | 'initializing' | 'downloading' | 'complete' | 'error' | 'aborted';

interface ExportState {
  status: ExportStatus;
  progress: number;
  bytesReceived: number;
  bytesTotal: number | null;
  error: Error | null;
}

export function useExportData() {
  const [state, setState] = useState<ExportState>({
    status: 'idle',
    progress: 0,
    bytesReceived: 0,
    bytesTotal: null,
    error: null,
  });
  
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const messageChannelRef = useRef<MessageChannel | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateState = useCallback((updates: Partial<ExportState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, bytesReceived, bytesWritten, bytesTotal, error } = event.data;

    switch (type) {
      case 'request-file-handle':
        (async () => {
          try {
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: `node-telemetry-${Date.now()}.csv`,
              types: [
                {
                  description: 'CSV Files',
                  accept: { 'text/csv': ['.csv'] },
                },
                {
                  description: 'JSON Files',
                  accept: { 'application/json': ['.json'] },
                },
              ],
            });

            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({
                type: 'init-file-stream',
                fileHandle,
              });
            }
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              updateState({ status: 'aborted' });
            } else {
              updateState({ status: 'error', error: err as Error });
            }
          }
        })();
        break;

      case 'progress':
        const progress = state.bytesTotal ? Math.min(100, (bytesReceived / state.bytesTotal) * 100) : 0;
        updateState({
          status: 'downloading',
          progress,
          bytesReceived,
        });
        break;

      case 'export-complete':
        updateState({
          status: 'complete',
          progress: 100,
          bytesReceived: bytesWritten,
        });
        break;

      case 'export-aborted':
        updateState({ status: 'aborted' });
        break;

      case 'export-error':
        updateState({
          status: 'error',
          error: error || new Error('Unknown export error'),
        });
        break;
    }
  }, [state.bytesTotal, updateState]);

  const startExport = useCallback(async (url: string, options: { format: 'csv' | 'json'; startDate: Date; endDate: Date; bytesTotal?: number }) => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers are not supported in this browser');
    }

    updateState({
      status: 'initializing',
      progress: 0,
      bytesReceived: 0,
      bytesTotal: options.bytesTotal || null,
      error: null,
    });

    try {
      const registration = await navigator.serviceWorker.ready;
      swRegistrationRef.current = registration;
      
      abortControllerRef.current = new AbortController();
      messageChannelRef.current = new MessageChannel();

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Stream-Export': 'true',
        },
        body: JSON.stringify({
          format: options.format,
          startDate: options.startDate.toISOString(),
          endDate: options.endDate.toISOString(),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateState({ status: 'aborted' });
      } else {
        updateState({ status: 'error', error: error as Error });
      }
    }
  }, [updateState, handleServiceWorkerMessage]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (swRegistrationRef.current?.active) {
      swRegistrationRef.current.active.postMessage({ type: 'abort-export' });
    }
    updateState({ status: 'aborted' });
  }, [updateState]);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
      bytesReceived: 0,
      bytesTotal: null,
      error: null,
    });
  }, []);

  return {
    state,
    startExport,
    abort,
    reset,
  };
}
