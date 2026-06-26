'use client';

/**
 * ScriptPlayground.tsx
 *
 * Two-pane Monaco-based script editor for custom alert rules.
 *
 * Left pane:  Monaco editor instance with JavaScript syntax highlighting,
 *             inline error markers, and a 10 KB size limit enforcer.
 * Right pane: JSON test-data editor, "Run Test" button, and output / error display.
 *
 * Scripts execute in a sandboxed Web Worker via `alertSandbox.ts`.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  executeScript,
  MAX_SCRIPT_LENGTH,
  type SandboxResult,
} from '../../lib/sandbox/alertSandbox';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SCRIPT = `// Custom alert rule script
// The \`data\` object is injected with live node / network metrics.
// Return \`true\` to trigger the alert, \`false\` to silence it.

// Example: trigger when average bandwidth exceeds 100 Mbps
//          AND node CPU usage is above 80%.
// return data.bandwidth > 100 && data.cpu > 0.8;

return data.value > 100;
`;

const DEFAULT_TEST_DATA = JSON.stringify(
  {
    value: 120,
    bandwidth: 150,
    cpu: 0.85,
    node: {
      id: 'node-1',
      region: 'us-east',
      uptime: 86400,
    },
  },
  null,
  2
);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ScriptPlaygroundProps {
  /** Initial script code to display. */
  initialCode?: string;
  /** Called whenever the script content changes (debounced). */
  onCodeChange?: (code: string) => void;
  /** Additional CSS class names for the root container. */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScriptPlayground({
  initialCode,
  onCodeChange,
  className = '',
}: ScriptPlaygroundProps) {
  // ── State ─────────────────────────────────────────────────────────────────

  const [code, setCode] = useState(initialCode ?? DEFAULT_SCRIPT);
  const [testData, setTestData] = useState(DEFAULT_TEST_DATA);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [charCount, setCharCount] = useState(
    (initialCode ?? DEFAULT_SCRIPT).length
  );

  // Monaco refs
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // ── Editor lifecycle ──────────────────────────────────────────────────────

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    // Configure JavaScript defaults for the playground environment
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      noEmit: true,
    });

    // Provide type information for the injected `data` parameter
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `
      /**
       * The data object is injected with live node / network metrics.
       * Access any property you need for your alert condition.
       */
      declare const data: {
        value?: number;
        bandwidth?: number;
        cpu?: number;
        node?: {
          id: string;
          region: string;
          uptime: number;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      `,
      'ts:alertPlayground/globals.d.ts'
    );
  }, []);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const v = value ?? '';
      setCode(v);
      setCharCount(v.length);
      onCodeChange?.(v);
    },
    [onCodeChange]
  );

  // ── Clear markers on code change ──────────────────────────────────────────

  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, 'sandbox', []);
    }
  }, [code]);

  // ── Run test ──────────────────────────────────────────────────────────────

  const runTest = useCallback(async () => {
    setIsRunning(true);
    setResult(null);

    // Parse test data
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(testData);
    } catch {
      setResult({
        success: false,
        result: null,
        error: {
          name: 'JSONParseError',
          message: 'Test data is not valid JSON. Please fix the JSON and try again.',
          stack: null,
        },
        durationMs: 0,
      });
      setIsRunning(false);
      return;
    }

    const execResult = await executeScript(code, parsedData);

    // Set Monaco markers for syntax errors
    if (
      !execResult.success &&
      execResult.error?.name === 'SyntaxError' &&
      monacoRef.current &&
      editorRef.current
    ) {
      const model = editorRef.current.getModel();
      if (model) {
        // Try to extract line number from error message
        const lineMatch = execResult.error.message.match(
          /line (\d+)/i
        );
        const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : 1;

        monacoRef.current.editor.setModelMarkers(model, 'sandbox', [
          {
            severity: monacoRef.current.MarkerSeverity.Error,
            message: execResult.error.message,
            startLineNumber: errorLine,
            startColumn: 1,
            endLineNumber: errorLine,
            endColumn: model.getLineMaxColumn(errorLine),
          },
        ]);
      }
    }

    setResult(execResult);
    setIsRunning(false);
  }, [code, testData]);

  // ── Size limit indicator ──────────────────────────────────────────────────

  const sizePercent = Math.min(
    100,
    Math.round((charCount / MAX_SCRIPT_LENGTH) * 100)
  );
  const isOverLimit = charCount > MAX_SCRIPT_LENGTH;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`script-playground ${className}`}
      id="script-playground-root"
    >
      {/* Header */}
      <div className="script-playground__header">
        <div className="script-playground__title-group">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <h3>Script Playground</h3>
        </div>
        <div
          className={`script-playground__size-badge ${
            isOverLimit ? 'script-playground__size-badge--over' : ''
          }`}
        >
          {charCount.toLocaleString()} / {MAX_SCRIPT_LENGTH.toLocaleString()} chars
          <div
            className="script-playground__size-bar"
            style={{ width: `${sizePercent}%` }}
          />
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="script-playground__panes">
        {/* Left: Monaco editor */}
        <div className="script-playground__editor-pane">
          <div className="script-playground__pane-label">
            <span className="script-playground__dot script-playground__dot--js" />
            alert-rule.js
          </div>
          <div className="script-playground__editor-wrapper">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              beforeMount={handleBeforeMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
                padding: { top: 12 },
                bracketPairColorization: { enabled: true },
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
              }}
            />
          </div>
        </div>

        {/* Right: Test data + output */}
        <div className="script-playground__test-pane">
          {/* Test data editor */}
          <div className="script-playground__test-data-section">
            <div className="script-playground__pane-label">
              <span className="script-playground__dot script-playground__dot--json" />
              Test Data (JSON)
            </div>
            <textarea
              id="script-playground-test-data"
              className="script-playground__textarea"
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              spellCheck={false}
              aria-label="Test data JSON input"
            />
          </div>

          {/* Run button */}
          <button
            id="script-playground-run-btn"
            className="script-playground__run-btn"
            onClick={runTest}
            disabled={isRunning || isOverLimit}
            aria-label="Run test script"
          >
            {isRunning ? (
              <>
                <span className="script-playground__spinner" />
                Executing…
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run Test
              </>
            )}
          </button>

          {/* Output / Error display */}
          <div className="script-playground__output-section">
            <div className="script-playground__pane-label">Output</div>
            <div
              id="script-playground-output"
              className={`script-playground__output ${
                result
                  ? result.success
                    ? 'script-playground__output--success'
                    : 'script-playground__output--error'
                  : ''
              }`}
              role="status"
              aria-live="polite"
            >
              {!result && (
                <span className="script-playground__output-placeholder">
                  Click &ldquo;Run Test&rdquo; to execute the script against the
                  test data.
                </span>
              )}
              {result && result.success && (
                <>
                  <div className="script-playground__output-header">
                    <span className="script-playground__result-icon script-playground__result-icon--success">
                      ✓
                    </span>
                    <span>
                      Completed in{' '}
                      <strong>{result.durationMs}ms</strong>
                    </span>
                  </div>
                  <pre className="script-playground__output-body">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </>
              )}
              {result && !result.success && (
                <>
                  <div className="script-playground__output-header">
                    <span className="script-playground__result-icon script-playground__result-icon--error">
                      ✕
                    </span>
                    <span>
                      {result.error?.name}
                      {result.durationMs > 0 && (
                        <> — {result.durationMs}ms</>
                      )}
                    </span>
                  </div>
                  <pre className="script-playground__output-body">
                    {result.error?.message}
                    {result.error?.stack && (
                      <>
                        {'\n\n'}
                        {result.error.stack}
                      </>
                    )}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
