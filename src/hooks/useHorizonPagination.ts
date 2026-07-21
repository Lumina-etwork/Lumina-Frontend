"use client";

/**
 * src/hooks/useHorizonPagination.ts
 *
 * Cursor-aware pagination hook for the Stellar Horizon API.
 *
 * Features:
 *  - Random-access paging via a client-side cursor cache (PageRecord[])
 *  - Background prefetch of 3 pages ahead of the current page
 *  - LRU eviction when cache exceeds MAX_CACHED_PAGES (50)
 *  - IndexedDB persistence across sessions (survives page reload)
 *  - Cursor-expiry detection: 404 / empty responses purge the stale cursor
 *  - goToPage(n): jumps directly if cached, else fetches sequentially with
 *    a user-visible warning
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  fetchPaymentsPage,
  type HorizonPaymentRecord,
} from "@/src/lib/horizon/horizonClient";
import {
  loadCursorCache,
  saveCursorCache,
  deleteCursorCache,
  type HorizonPageRecord,
} from "@/src/lib/storage/idb";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 50;
const DEFAULT_PREFETCH_WINDOW = 3;
/** Maximum pages stored in the in-memory + IDB cursor cache before LRU eviction */
const MAX_CACHED_PAGES = 50;

// ─── Public types ─────────────────────────────────────────────────────────────

export type { HorizonPageRecord };

export interface UseHorizonPaginationOptions {
  /** Records per page. Fixed at 50 per Horizon spec; override for testing only. */
  limit?: number;
  /** How many pages ahead to prefetch. Default 3. */
  prefetchWindow?: number;
}

export interface UseHorizonPaginationResult {
  /** Current page's payment records */
  records: HorizonPaymentRecord[];
  /** 0-based index of the currently visible page */
  pageIndex: number;
  /** Number of pages whose cursors are currently cached */
  totalCachedPages: number;
  /** True while a foreground page fetch is in flight */
  loading: boolean;
  /** Set when the Horizon call fails or a cursor expires */
  error: string | null;
  /** Set when goToPage triggers intermediate page fetches */
  warning: string | null;
  nextPage(): void;
  prevPage(): void;
  /** Navigate to page `n` (0-based). Warns if intermediate fetches are needed. */
  goToPage(n: number): void;
}

// ─── Internal state shape ─────────────────────────────────────────────────────

interface PaginationState {
  cursors: HorizonPageRecord[];
  pageIndex: number;
  records: HorizonPaymentRecord[];
  loading: boolean;
  error: string | null;
  warning: string | null;
}

type PaginationAction =
  | { type: "LOAD_START" }
  | {
      type: "LOAD_SUCCESS";
      pageIndex: number;
      records: HorizonPaymentRecord[];
      cursors: HorizonPageRecord[];
    }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SET_WARNING"; warning: string | null }
  | { type: "RESTORE_CACHE"; cursors: HorizonPageRecord[] };

function reducer(
  state: PaginationState,
  action: PaginationAction
): PaginationState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return {
        ...state,
        loading: false,
        error: null,
        pageIndex: action.pageIndex,
        records: action.records,
        cursors: action.cursors,
      };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "SET_WARNING":
      return { ...state, warning: action.warning };
    case "RESTORE_CACHE":
      return { ...state, cursors: action.cursors };
    default:
      return state;
  }
}

const initialState: PaginationState = {
  cursors: [],
  pageIndex: 0,
  records: [],
  loading: false,
  error: null,
  warning: null,
};

// ─── LRU eviction ─────────────────────────────────────────────────────────────

/**
 * Evicts pages furthest from `currentIndex` so that the cache never exceeds
 * MAX_CACHED_PAGES entries. Pages adjacent to `currentIndex` are kept first.
 */
function evictLRU(
  pages: HorizonPageRecord[],
  currentIndex: number
): HorizonPageRecord[] {
  if (pages.length <= MAX_CACHED_PAGES) return pages;

  // Sort by distance from current page (descending — furthest first)
  const sorted = [...pages].sort(
    (a, b) =>
      Math.abs(b.index - currentIndex) - Math.abs(a.index - currentIndex)
  );
  const kept = sorted.slice(pages.length - MAX_CACHED_PAGES);
  // Re-sort by index to keep ascending order
  return kept.sort((a, b) => a.index - b.index);
}

// ─── Cursor cache key ─────────────────────────────────────────────────────────

function cacheKey(accountId: string): string {
  return `horizon/cursors/${accountId}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHorizonPagination(
  accountId: string,
  options: UseHorizonPaginationOptions = {}
): UseHorizonPaginationResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const prefetchWindow = options.prefetchWindow ?? DEFAULT_PREFETCH_WINDOW;

  const [state, dispatch] = useReducer(reducer, initialState);

  // Ref so that callbacks always see the latest state without stale closure issues
  const stateRef = useRef(state);
  stateRef.current = state;

  // Prevent concurrent foreground fetches
  const fetchingRef = useRef(false);
  // Prefetch abort to cancel outstanding background requests on unmount
  const prefetchAbortRef = useRef<AbortController | null>(null);

  // ── Persist helper ──────────────────────────────────────────────────────────
  const persist = useCallback(
    async (cursors: HorizonPageRecord[]) => {
      await saveCursorCache(cacheKey(accountId), cursors);
    },
    [accountId]
  );

  // ── Core page loader ────────────────────────────────────────────────────────
  /**
   * Fetches page `targetIndex` from Horizon using `cursor`.
   * Returns the updated cursors array and the page records, or throws.
   */
  const loadPage = useCallback(
    async (
      cursor: string | null,
      targetIndex: number,
      existingCursors: HorizonPageRecord[]
    ): Promise<{ cursors: HorizonPageRecord[]; records: HorizonPaymentRecord[] }> => {
      const result = await fetchPaymentsPage(
        accountId,
        cursor ?? undefined,
        "desc",
        limit
      );

      // Cursor expiry: Horizon returns empty records when the cursor refers to
      // erased ledger data (beyond maxLimit). Treat this as expiry.
      if (result.records.length === 0 && targetIndex > 0) {
        await deleteCursorCache(cacheKey(accountId));
        throw new Error(
          "Cursor expired: ledger records are no longer available. Resetting to page 1."
        );
      }

      const newRecord: HorizonPageRecord = {
        index: targetIndex,
        cursor,
        prevCursor: result.prevCursor,
        nextCursor: result.nextCursor,
      };

      // Upsert into cache (replace existing entry for this index, or append)
      const updated = existingCursors.filter((p) => p.index !== targetIndex);
      updated.push(newRecord);
      updated.sort((a, b) => a.index - b.index);

      return { cursors: updated, records: result.records };
    },
    [accountId, limit]
  );

  // ── Background prefetch ─────────────────────────────────────────────────────
  const prefetch = useCallback(
    async (afterIndex: number, cursors: HorizonPageRecord[]) => {
      // Cancel any prior prefetch batch
      prefetchAbortRef.current?.abort();
      const ctl = new AbortController();
      prefetchAbortRef.current = ctl;

      let current = cursors;
      for (let i = 1; i <= prefetchWindow; i++) {
        if (ctl.signal.aborted) break;
        const targetIndex = afterIndex + i;
        if (current.some((p) => p.index === targetIndex)) continue; // already cached

        const prevPage = current.find((p) => p.index === targetIndex - 1);
        if (!prevPage?.nextCursor) break; // chain broken

        try {
          const { cursors: updated } = await loadPage(
            prevPage.nextCursor,
            targetIndex,
            current
          );
          if (ctl.signal.aborted) break;
          current = evictLRU(updated, afterIndex);
          await persist(current);
        } catch {
          break; // silently stop prefetch on error
        }
      }
    },
    [prefetchWindow, loadPage, persist]
  );

  // ── Navigate to a specific page ─────────────────────────────────────────────
  const navigateToPage = useCallback(
    async (targetIndex: number) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      dispatch({ type: "LOAD_START" });

      const { cursors } = stateRef.current;

      try {
        // Check if we already have the cursor for this page cached
        const cached = cursors.find((p) => p.index === targetIndex);

        if (cached) {
          // Cursor is in cache — fetch with it directly
          const { cursors: updated, records } = await loadPage(
            cached.cursor,
            targetIndex,
            cursors
          );
          const evicted = evictLRU(updated, targetIndex);
          await persist(evicted);
          dispatch({
            type: "LOAD_SUCCESS",
            pageIndex: targetIndex,
            records,
            cursors: evicted,
          });
          dispatch({ type: "SET_WARNING", warning: null });
          prefetch(targetIndex, evicted);
          return;
        }

        // Cursor not cached — must fetch intermediate pages sequentially
        dispatch({
          type: "SET_WARNING",
          warning: "Fetching intermediate pages — this may be slow.",
        });

        // Find nearest cached page below targetIndex
        const nearest = cursors
          .filter((p) => p.index < targetIndex)
          .sort((a, b) => b.index - a.index)[0];

        let startIndex = nearest ? nearest.index + 1 : 0;
        let current = cursors;
        let lastRecords: HorizonPaymentRecord[] = [];

        if (startIndex === 0 && !nearest) {
          // Fetch from page 0 with no cursor
          const { cursors: updated, records } = await loadPage(null, 0, current);
          current = evictLRU(updated, targetIndex);
          lastRecords = records;
          startIndex = 1;
          if (targetIndex === 0) {
            await persist(current);
            dispatch({
              type: "LOAD_SUCCESS",
              pageIndex: 0,
              records,
              cursors: current,
            });
            dispatch({ type: "SET_WARNING", warning: null });
            prefetch(0, current);
            return;
          }
        }

        for (let idx = startIndex; idx <= targetIndex; idx++) {
          const prevRecord = current.find((p) => p.index === idx - 1);
          if (!prevRecord?.nextCursor) {
            throw new Error(`Cannot reach page ${idx}: missing cursor chain.`);
          }
          const { cursors: updated, records } = await loadPage(
            prevRecord.nextCursor,
            idx,
            current
          );
          current = evictLRU(updated, targetIndex);
          lastRecords = records;
        }

        await persist(current);
        dispatch({
          type: "LOAD_SUCCESS",
          pageIndex: targetIndex,
          records: lastRecords,
          cursors: current,
        });
        dispatch({ type: "SET_WARNING", warning: null });
        prefetch(targetIndex, current);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load page.";
        dispatch({ type: "LOAD_ERROR", error: msg });
      } finally {
        fetchingRef.current = false;
      }
    },
    [loadPage, persist, prefetch]
  );

  // ── Mount: restore cache from IDB, then load page 0 if needed ──────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await loadCursorCache(cacheKey(accountId));
      if (cancelled) return;

      if (stored && stored.pages.length > 0) {
        dispatch({ type: "RESTORE_CACHE", cursors: stored.pages });
        // Navigate to page 0 using the cached cursor (null → first page)
        const page0 = stored.pages.find((p) => p.index === 0);
        if (page0) {
          await navigateToPage(0);
        }
      } else {
        await navigateToPage(0);
      }
    })();

    return () => {
      cancelled = true;
      prefetchAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // ── Public navigation actions ───────────────────────────────────────────────
  const nextPage = useCallback(() => {
    navigateToPage(stateRef.current.pageIndex + 1);
  }, [navigateToPage]);

  const prevPage = useCallback(() => {
    const prev = stateRef.current.pageIndex - 1;
    if (prev >= 0) navigateToPage(prev);
  }, [navigateToPage]);

  const goToPage = useCallback(
    (n: number) => {
      if (n >= 0) navigateToPage(n);
    },
    [navigateToPage]
  );

  return {
    records: state.records,
    pageIndex: state.pageIndex,
    totalCachedPages: state.cursors.length,
    loading: state.loading,
    error: state.error,
    warning: state.warning,
    nextPage,
    prevPage,
    goToPage,
  };
}
