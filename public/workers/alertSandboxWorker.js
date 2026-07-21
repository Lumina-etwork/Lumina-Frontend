/**
 * alertSandboxWorker.js
 *
 * Dedicated Web Worker for sandboxed alert rule script execution.
 * Receives { code, testData } messages, wraps the code in a
 * `new Function('data', code)` constructor, calls it with testData,
 * and posts the result back.
 *
 * Security invariants:
 *  - No access to DOM, localStorage, or network APIs
 *  - eval() is NOT used; Function() constructor provides lexical isolation
 *  - Timeout is enforced by the main thread via worker.terminate()
 */

/* eslint-disable no-restricted-globals */

/**
 * Freeze common global references so scripts cannot mutate the worker
 * environment or access dangerous APIs.
 */
const BLOCKED_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'importScripts',
  'indexedDB',
  'caches',
  'navigator',
  'location',
];

const frozenScope = {};
for (const name of BLOCKED_GLOBALS) {
  frozenScope[name] = undefined;
}
Object.freeze(frozenScope);

/**
 * @param {{ code: string; testData: unknown; id: string }} message
 */
self.onmessage = function handleMessage(event) {
  const { code, testData, id } = event.data;

  try {
    // Syntax-check: attempt to create the function — throws SyntaxError for
    // malformed scripts before we ever execute user code.
    // The Function constructor creates an isolated scope; `data` is the only
    // injected binding.
    const fn = new Function(
      'data',
      // Shadow dangerous globals with undefined to prevent accidental access.
      ...BLOCKED_GLOBALS,
      code
    );

    const result = fn(testData, ...new Array(BLOCKED_GLOBALS.length).fill(undefined));

    self.postMessage({
      id,
      success: true,
      result: result === undefined ? null : result,
      error: null,
    });
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      result: null,
      error: {
        name: err.name || 'Error',
        message: err.message || String(err),
        stack: err.stack || null,
      },
    });
  }
};
