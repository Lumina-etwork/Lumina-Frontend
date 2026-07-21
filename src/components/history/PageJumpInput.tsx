"use client";

/**
 * src/components/history/PageJumpInput.tsx
 *
 * A numeric input + "Go" button for jumping directly to a page number
 * in the Horizon payment history table.
 *
 * Props are kept intentionally thin so this component is reusable with
 * any hook that conforms to the same interface.
 */

import React, { useState, useCallback, useId } from "react";

export interface PageJumpInputProps {
  /** Current 0-based page index (displayed as 1-based to the user) */
  currentPage: number;
  /** Number of pages whose cursors are already cached */
  totalCachedPages: number;
  /** True while the parent hook is fetching */
  loading: boolean;
  /** Warning message from the hook (e.g. "Fetching intermediate pages…") */
  warning: string | null;
  /** Called with a 0-based page index when the user confirms navigation */
  onGoToPage: (pageIndex: number) => void;
}

export function PageJumpInput({
  currentPage,
  totalCachedPages,
  loading,
  warning,
  onGoToPage,
}: PageJumpInputProps) {
  const inputId = useId();
  const [raw, setRaw] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Convert the user-facing 1-based number to a 0-based index
  const handleGo = useCallback(() => {
    const num = parseInt(raw, 10);

    if (!Number.isFinite(num) || num < 1) {
      setValidationError("Please enter a valid page number (≥ 1).");
      return;
    }

    setValidationError(null);
    onGoToPage(num - 1); // convert to 0-based
    setRaw("");
  }, [raw, onGoToPage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleGo();
    },
    [handleGo]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only digit characters
      const val = e.target.value.replace(/[^0-9]/g, "");
      setRaw(val);
      if (validationError) setValidationError(null);
    },
    [validationError]
  );

  const enteredPage = parseInt(raw, 10);
  // The Go button is disabled when loading OR when the entered page is
  // beyond the cached range AND we're already in a loading state
  const isDisabled = loading || raw === "";

  return (
    <div className="page-jump-input" role="group" aria-label="Jump to page">
      <label htmlFor={inputId} className="page-jump-label">
        Go to page
      </label>

      <div className="page-jump-controls">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={`page-jump-field${validationError ? " page-jump-field--error" : ""}`}
          value={raw}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={String(currentPage + 1)}
          disabled={loading}
          aria-label="Page number"
          aria-describedby={
            validationError
              ? `${inputId}-error`
              : warning
                ? `${inputId}-warning`
                : undefined
          }
        />

        <button
          id={`${inputId}-go-btn`}
          type="button"
          className="page-jump-btn"
          onClick={handleGo}
          disabled={isDisabled}
          aria-busy={loading}
        >
          {loading ? (
            <span className="page-jump-spinner" aria-hidden="true" />
          ) : (
            "Go"
          )}
        </button>
      </div>

      {/* Contextual hint: cached vs uncached target */}
      {raw !== "" && Number.isFinite(enteredPage) && enteredPage > 0 && (
        <p className="page-jump-hint">
          {enteredPage - 1 < totalCachedPages ? (
            <span className="page-jump-hint--cached">
              ✓ Page {enteredPage} is cached — instant navigation
            </span>
          ) : (
            <span className="page-jump-hint--uncached">
              ⚠ Page {enteredPage} requires fetching{" "}
              {enteredPage - 1 - totalCachedPages + 1} intermediate page
              {enteredPage - 1 - totalCachedPages + 1 !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      )}

      {/* Validation error */}
      {validationError && (
        <p
          id={`${inputId}-error`}
          className="page-jump-error"
          role="alert"
          aria-live="assertive"
        >
          {validationError}
        </p>
      )}

      {/* Hook-level warning (intermediate page fetch) */}
      {warning && !validationError && (
        <p
          id={`${inputId}-warning`}
          className="page-jump-warning"
          role="status"
          aria-live="polite"
        >
          ⚠ {warning}
        </p>
      )}

      <style>{`
        .page-jump-input {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-family: inherit;
        }

        .page-jump-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--color-text-secondary, #8b9caa);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .page-jump-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .page-jump-field {
          width: 72px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #2d3748);
          background: var(--color-surface, #1a2234);
          color: var(--color-text, #e2e8f0);
          font-size: 0.875rem;
          text-align: center;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          outline: none;
        }

        .page-jump-field:focus {
          border-color: var(--color-accent, #6c63ff);
          box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.2);
        }

        .page-jump-field--error {
          border-color: #e53e3e;
        }

        .page-jump-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-jump-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          background: var(--color-accent, #6c63ff);
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 48px;
          height: 34px;
        }

        .page-jump-btn:hover:not(:disabled) {
          background: var(--color-accent-hover, #574fd6);
        }

        .page-jump-btn:active:not(:disabled) {
          transform: scale(0.96);
        }

        .page-jump-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .page-jump-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: page-jump-spin 0.6s linear infinite;
          display: block;
        }

        @keyframes page-jump-spin {
          to { transform: rotate(360deg); }
        }

        .page-jump-hint {
          font-size: 0.76rem;
          margin: 0;
        }

        .page-jump-hint--cached {
          color: #48bb78;
        }

        .page-jump-hint--uncached {
          color: #ed8936;
        }

        .page-jump-error {
          font-size: 0.76rem;
          color: #fc8181;
          margin: 0;
        }

        .page-jump-warning {
          font-size: 0.76rem;
          color: #ed8936;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
