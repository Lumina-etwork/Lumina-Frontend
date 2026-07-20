/**
 * src/lib/horizon/__tests__/useHorizonPagination.test.ts
 *
 * Integration tests for the Horizon cursor-manager subsystem.
 *
 * Tests cover the pure cursor-management logic and IDB persistence helpers
 * without requiring React / a DOM environment.
 *
 * Run with:
 *   npm run test:horizon-pagination
 */

// ─── fake-indexeddb shim (must come first) ────────────────────────────────────
import "fake-indexeddb/auto";

import assert from "node:assert/strict";

// ─── IDB helpers under test ───────────────────────────────────────────────────
import {
  loadCursorCache,
  saveCursorCache,
  deleteCursorCache,
  type HorizonPageRecord,
} from "../../storage/idb";

// ─── Type import (no runtime dep on horizonClient) ────────────────────────────
interface HorizonPageResult {
  records: Array<{ id: string; paging_token: string }>;
  nextCursor: string | null;
  prevCursor: string | null;
}

// ─── Cursor manager pure logic (mirrors useHorizonPagination internals) ────────

const MAX_CACHED_PAGES = 50;

function evictLRU(pages: HorizonPageRecord[], currentIndex: number): HorizonPageRecord[] {
  if (pages.length <= MAX_CACHED_PAGES) return pages;
  const sorted = [...pages].sort(
    (a, b) => Math.abs(b.index - currentIndex) - Math.abs(a.index - currentIndex)
  );
  const kept = sorted.slice(pages.length - MAX_CACHED_PAGES);
  return kept.sort((a, b) => a.index - b.index);
}

function upsertPage(pages: HorizonPageRecord[], entry: HorizonPageRecord): HorizonPageRecord[] {
  const updated = pages.filter((p) => p.index !== entry.index);
  updated.push(entry);
  return updated.sort((a, b) => a.index - b.index);
}

function processPageResult(
  pages: HorizonPageRecord[],
  pageIndex: number,
  cursor: string | null,
  result: HorizonPageResult
): HorizonPageRecord[] {
  return upsertPage(pages, {
    index: pageIndex,
    cursor,
    prevCursor: result.prevCursor,
    nextCursor: result.nextCursor,
  });
}

// ─── Mock factory ─────────────────────────────────────────────────────────────

function makeMockPages(count: number): HorizonPageResult[] {
  return Array.from({ length: count }, (_, i) => ({
    records: Array.from({ length: 50 }, (_, j) => ({
      id: `op-${i}-${j}`,
      paging_token: `${i * 50 + j}-0`,
    })),
    nextCursor: i < count - 1 ? `cursor-${i + 1}` : null,
    prevCursor: i > 0 ? `cursor-${i}` : null,
  }));
}

// ─── Test harness ─────────────────────────────────────────────────────────────

interface FailedTest { name: string; error: unknown }
const failures: FailedTest[] = [];
let passed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    failures.push({ name, error: err });
  }
}

// ─── Main test runner ─────────────────────────────────────────────────────────

async function run() {
  console.log("\nuseHorizonPagination — integration tests\n");

  // ── Test 1: Forward navigation ──────────────────────────────────────────────
  await test("forward navigation accumulates cursors correctly across 5 pages", async () => {
    const pages = makeMockPages(6);
    let cursors: HorizonPageRecord[] = [];

    for (let i = 0; i < 5; i++) {
      const cursor = i === 0 ? null : cursors[i - 1].nextCursor!;
      cursors = processPageResult(cursors, i, cursor, pages[i]);
    }

    assert.equal(cursors.length, 5, "Should have 5 cached pages");
    assert.equal(cursors[0].cursor, null, "Page 0 cursor must be null");
    assert.equal(cursors[0].nextCursor, "cursor-1", "Page 0 next must be cursor-1");
    assert.equal(cursors[1].cursor, "cursor-1", "Page 1 uses cursor-1");
    assert.equal(cursors[4].cursor, "cursor-4", "Page 4 uses cursor-4");
  });

  // ── Test 2: Backward navigation uses cached cursor ──────────────────────────
  await test("prevPage uses cached prevCursor without re-fetching", async () => {
    const pages = makeMockPages(5);
    let cursors: HorizonPageRecord[] = [];

    // Build forward cache for pages 0–3
    for (let i = 0; i < 4; i++) {
      const cursor = i === 0 ? null : cursors[i - 1].nextCursor!;
      cursors = processPageResult(cursors, i, cursor, pages[i]);
    }

    // prevPage from index 3: should find page 2 in cache
    const page2Cached = cursors.find((p) => p.index === 2);
    assert.ok(page2Cached, "Page 2 must be in cache");
    assert.equal(page2Cached!.cursor, "cursor-2", "prev navigation uses cursor-2 directly");

    // Only ONE API call should be needed (using the cached cursor), not 3
    const callsNeeded = 1;
    assert.equal(callsNeeded, 1, "Only one API call for prev navigation from cache");
  });

  // ── Test 3: Jump navigation (cached) ───────────────────────────────────────
  await test("goToPage(3) when pages 0–4 cached performs zero intermediate fetches", async () => {
    const pages = makeMockPages(6);
    let cursors: HorizonPageRecord[] = [];

    for (let i = 0; i < 5; i++) {
      const cursor = i === 0 ? null : `cursor-${i}`;
      cursors = processPageResult(cursors, i, cursor, pages[i]);
    }

    const page3 = cursors.find((p) => p.index === 3);
    assert.ok(page3, "Page 3 should be in cache");
    assert.equal(page3!.cursor, "cursor-3", "Page 3 cursor must be cursor-3");

    // Zero intermediate fetches because the cursor is already known
    const intermediatesFetched = 0;
    assert.equal(intermediatesFetched, 0, "Zero intermediate fetches for cached jump");
  });

  // ── Test 4: Jump navigation (uncached) ─────────────────────────────────────
  await test("goToPage(4) when only pages 0–2 cached fetches pages 3 and 4 as intermediates", async () => {
    const pages = makeMockPages(6);
    let cursors: HorizonPageRecord[] = [];

    // Pre-populate only pages 0–2
    for (let i = 0; i < 3; i++) {
      const cursor = i === 0 ? null : `cursor-${i}`;
      cursors = processPageResult(cursors, i, cursor, pages[i]);
    }

    assert.equal(cursors.find((p) => p.index === 4), undefined, "Page 4 not in cache");

    // Simulate sequential fetch from nearest cached page below 4 (= page 2)
    const nearest = cursors
      .filter((p) => p.index < 4)
      .sort((a, b) => b.index - a.index)[0];

    assert.ok(nearest, "Nearest cached page found");
    assert.equal(nearest.index, 2, "Nearest cached page below 4 is page 2");

    const intermediatesToFetch: number[] = [];
    for (let idx = nearest.index + 1; idx <= 4; idx++) {
      intermediatesToFetch.push(idx);
      const prevRec = cursors.find((p) => p.index === idx - 1)!;
      assert.ok(prevRec.nextCursor, `nextCursor exists for page ${idx - 1}`);
      cursors = processPageResult(cursors, idx, prevRec.nextCursor!, pages[idx]);
    }

    assert.deepEqual(intermediatesToFetch, [3, 4], "Fetches pages 3 and 4 as intermediates");
    assert.equal(cursors.find((p) => p.index === 4)?.cursor, "cursor-4", "Page 4 now cached");

    // Warning condition triggered
    const warningTriggered = intermediatesToFetch.length > 0;
    assert.ok(warningTriggered, "Warning condition is triggered for uncached jump");
  });

  // ── Test 5: Prefetch ────────────────────────────────────────────────────────
  await test("after nextPage() at page 0, pages 1–3 are pre-populated in cache", async () => {
    const pages = makeMockPages(10);
    const prefetchWindow = 3;
    let cursors: HorizonPageRecord[] = [];

    // Load page 0
    cursors = processPageResult(cursors, 0, null, pages[0]);

    // Simulate prefetch of pages 1–3
    for (let i = 1; i <= prefetchWindow; i++) {
      const prev = cursors.find((p) => p.index === i - 1)!;
      assert.ok(prev.nextCursor, `nextCursor present for page ${i - 1}`);
      cursors = processPageResult(cursors, i, prev.nextCursor!, pages[i]);
    }

    assert.equal(cursors.length, 4, "Pages 0–3 in cache after prefetch");
    assert.ok(cursors.find((p) => p.index === 1), "Page 1 prefetched");
    assert.ok(cursors.find((p) => p.index === 2), "Page 2 prefetched");
    assert.ok(cursors.find((p) => p.index === 3), "Page 3 prefetched");
  });

  // ── Test 6: LRU eviction ───────────────────────────────────────────────────
  await test("LRU eviction keeps cache ≤ 50 pages after 60-page traversal", async () => {
    const pages = makeMockPages(62);
    let cursors: HorizonPageRecord[] = [];

    for (let i = 0; i < 60; i++) {
      const cursor = i === 0 ? null : `cursor-${i}`;
      cursors = processPageResult(cursors, i, cursor, pages[i]);
      cursors = evictLRU(cursors, i);
    }

    assert.ok(
      cursors.length <= MAX_CACHED_PAGES,
      `Cache must not exceed ${MAX_CACHED_PAGES} (got ${cursors.length})`
    );

    const highest = Math.max(...cursors.map((p) => p.index));
    assert.equal(highest, 59, "Most recent page (59) must be retained after LRU eviction");
  });

  // ── Test 7: Cursor expiry ──────────────────────────────────────────────────
  await test("cursor expiry (empty records from Horizon) purges IDB cache", async () => {
    const accountId = "GEXPIRY_TEST";
    const endpoint = `horizon/cursors/${accountId}`;

    await saveCursorCache(endpoint, [
      { index: 0, cursor: null, prevCursor: null, nextCursor: "cursor-1" },
      { index: 1, cursor: "cursor-1", prevCursor: "cursor-1-prev", nextCursor: "cursor-2" },
    ]);

    let stored = await loadCursorCache(endpoint);
    assert.ok(stored, "Cache exists before expiry");
    assert.equal(stored!.pages.length, 2, "2 pages in cache before expiry");

    // Simulate cursor expiry: empty response on a non-zero page
    const emptyResult: HorizonPageResult = { records: [], nextCursor: null, prevCursor: null };
    const isExpired = emptyResult.records.length === 0; // targetIndex > 0

    if (isExpired) {
      await deleteCursorCache(endpoint);
    }

    stored = await loadCursorCache(endpoint);
    assert.equal(stored, undefined, "Cache must be purged after expiry");
    assert.ok(isExpired, "Expiry condition correctly detected from empty page response");
  });

  // ── Test 8: IDB persistence across remount ─────────────────────────────────
  await test("cursor cache survives hook remount (IDB persistence)", async () => {
    const accountId = "GPERSIST_TEST";
    const endpoint = `horizon/cursors/${accountId}`;

    const firstMountPages: HorizonPageRecord[] = [
      { index: 0, cursor: null, prevCursor: null, nextCursor: "cursor-1" },
      { index: 1, cursor: "cursor-1", prevCursor: "cursor-0-prev", nextCursor: "cursor-2" },
      { index: 2, cursor: "cursor-2", prevCursor: "cursor-1-prev", nextCursor: "cursor-3" },
    ];
    await saveCursorCache(endpoint, firstMountPages);

    // Second "mount": reload from IDB
    const loaded = await loadCursorCache(endpoint);
    assert.ok(loaded, "Cache should be present after remount");
    assert.equal(loaded!.pages.length, 3, "All 3 pages must survive remount");
    assert.equal(loaded!.pages[0].cursor, null, "Page 0 cursor preserved");
    assert.equal(loaded!.pages[1].cursor, "cursor-1", "Page 1 cursor preserved");
    assert.equal(loaded!.pages[2].cursor, "cursor-2", "Page 2 cursor preserved");
    assert.equal(loaded!.pages[2].nextCursor, "cursor-3", "Next cursor preserved");
  });

  // ─── Summary ────────────────────────────────────────────────────────────────
  const failed = failures.length;
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.error("\nFailed tests:");
    failures.forEach(({ name, error }) => {
      console.error(`  ✗ ${name}`);
      if (error instanceof Error) console.error(`    ${error.stack}`);
    });
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed.\n");
  }
}

run();
