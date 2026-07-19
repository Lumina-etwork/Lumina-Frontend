/**
 * alertSandbox.ts
 *
 * Thin wrapper around the alert sandbox Web Worker.
 * Creates / reuses a dedicated worker, sends { code, testData } messages,
 * and returns a promise that resolves with the execution result.
 *
 * Timeout enforcement: if the script exceeds EXECUTION_TIMEOUT_MS (5 000 ms),
 * the worker is terminated and a new one is spawned for subsequent runs.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum execution time before a script is forcibly killed. */
export const EXECUTION_TIMEOUT_MS = 5_000;

/** Maximum script length in bytes (10 KB). */
export const MAX_SCRIPT_LENGTH = 10 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SandboxResult {
  /** Whether the script completed without errors. */
  success: boolean;
  /** The return value of the script (or null). */
  result: unknown;
  /** Error details when success is false. */
  error: SandboxError | null;
  /** Execution duration in milliseconds. */
  durationMs: number;
}

export interface SandboxError {
  name: string;
  message: string;
  stack: string | null;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  result: unknown;
  error: SandboxError | null;
}

// ─── Worker lifecycle ─────────────────────────────────────────────────────────

let worker: Worker | null = null;
let nextId = 0;

function createWorker(): Worker {
  return new Worker('/workers/alertSandboxWorker.js');
}

function getWorker(): Worker {
  if (!worker) {
    worker = createWorker();
  }
  return worker;
}

/**
 * Terminate the current worker and discard the reference.
 * The next call to `executeScript` will spawn a fresh one.
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute an alert rule script in the sandboxed worker.
 *
 * @param code      JavaScript source code (max 10 KB).
 * @param testData  Data object injected as the `data` parameter.
 * @returns         A promise that resolves with the execution result.
 */
export function executeScript(
  code: string,
  testData: unknown
): Promise<SandboxResult> {
  // ── Pre-flight checks ───────────────────────────────────────────────────

  if (code.length > MAX_SCRIPT_LENGTH) {
    return Promise.resolve({
      success: false,
      result: null,
      error: {
        name: 'ScriptTooLargeError',
        message: `Script exceeds the maximum allowed length of ${MAX_SCRIPT_LENGTH} bytes (got ${code.length}).`,
        stack: null,
      },
      durationMs: 0,
    });
  }

  // ── Execution ───────────────────────────────────────────────────────────

  const id = String(++nextId);
  const startTime = performance.now();

  return new Promise<SandboxResult>((resolve) => {
    const w = getWorker();

    // Timeout guard — forcibly terminate the worker if it exceeds the budget.
    const timer = setTimeout(() => {
      terminateWorker();
      resolve({
        success: false,
        result: null,
        error: {
          name: 'TimeoutError',
          message: `Script execution exceeded the ${EXECUTION_TIMEOUT_MS}ms timeout and was terminated.`,
          stack: null,
        },
        durationMs: EXECUTION_TIMEOUT_MS,
      });
    }, EXECUTION_TIMEOUT_MS);

    // Message handler — scoped to this execution's correlation ID.
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return;

      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);

      const durationMs = Math.round(performance.now() - startTime);

      resolve({
        success: event.data.success,
        result: event.data.result,
        error: event.data.error,
        durationMs,
      });
    };

    // Worker-level error handler (e.g. script loading failure).
    const onError = (event: ErrorEvent) => {
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);

      const durationMs = Math.round(performance.now() - startTime);

      resolve({
        success: false,
        result: null,
        error: {
          name: 'WorkerError',
          message: event.message || 'An unexpected worker error occurred.',
          stack: null,
        },
        durationMs,
      });
    };

    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);

    // Post the script + test data to the worker.
    w.postMessage({ code, testData, id });
  });
}
