/**
 * src/lib/horizon/horizonClient.ts
 *
 * Thin wrapper around @stellar/stellar-sdk's Horizon.Server.
 * Provides typed, cursor-aware payment page fetching for the
 * useHorizonPagination hook.
 *
 * Cursor format (Horizon): "<paging_token>" — the raw string returned
 * in each record's `paging_token` field and encoded in _links.next/prev
 * href query params.
 */

import { Horizon } from "@stellar/stellar-sdk";

// ─── Configuration ────────────────────────────────────────────────────────────

let horizonUrl =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

export function configureHorizonClient(url: string): void {
  horizonUrl = url;
}

function getServer(): Horizon.Server {
  return new Horizon.Server(horizonUrl, { allowHttp: horizonUrl.startsWith("http://") });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HorizonPaymentRecord {
  id: string;
  paging_token: string;
  type: string;
  created_at: string;
  transaction_hash: string;
  /** Present on payment / path_payment operations */
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  from?: string;
  to?: string;
  /** Present on create_account operations */
  starting_balance?: string;
  funder?: string;
  account?: string;
  /** Memo — fetched from the parent transaction when available */
  memo?: string;
  memo_type?: string;
}

/**
 * Parsed result of a single Horizon page call.
 *
 * `nextCursor` / `prevCursor` are the raw paging_token strings needed for
 * subsequent calls.  They are `null` when the respective link is missing
 * (first / last page).
 */
export interface HorizonPageResult {
  records: HorizonPaymentRecord[];
  nextCursor: string | null;
  prevCursor: string | null;
}

// ─── Cursor extraction ───────────────────────────────────────────────────────

/**
 * Extracts the `cursor` query-parameter value from a Horizon _links href.
 *
 * @example
 * extractCursor("https://horizon.stellar.org/accounts/G…/payments?cursor=123456789-0&limit=50&order=asc")
 * // → "123456789-0"
 */
function extractCursor(href: string | undefined): string | null {
  if (!href) return null;
  try {
    const url = new URL(href);
    return url.searchParams.get("cursor");
  } catch {
    return null;
  }
}

// ─── Horizon SDK response shape (minimal) ────────────────────────────────────

interface HorizonCollectionPage<T> {
  records: T[];
  next: () => Promise<HorizonCollectionPage<T>>;
  prev: () => Promise<HorizonCollectionPage<T>>;
  _links?: {
    next?: { href: string };
    prev?: { href: string };
  };
}

// ─── Main fetch function ──────────────────────────────────────────────────────

/**
 * Fetches a single page of payment operations for `accountId`.
 *
 * @param accountId   - Stellar public key (G…)
 * @param cursor      - Paging token for this page, or `undefined` for the first page
 * @param order       - "asc" (oldest-first) or "desc" (newest-first)
 * @param limit       - Records per page (1–200, Horizon default 10, recommended 50)
 */
export async function fetchPaymentsPage(
  accountId: string,
  cursor: string | undefined,
  order: "asc" | "desc" = "desc",
  limit: number = 50
): Promise<HorizonPageResult> {
  const server = getServer();

  let builder = server
    .payments()
    .forAccount(accountId)
    .order(order)
    .limit(limit);

  if (cursor) {
    builder = builder.cursor(cursor);
  }

  const page = (await builder.call()) as HorizonCollectionPage<HorizonPaymentRecord>;

  const nextCursor = extractCursor(page._links?.next?.href ?? undefined);
  const prevCursor = extractCursor(page._links?.prev?.href ?? undefined);

  // Last record's paging_token is also a valid next-page cursor but the
  // _links href is the canonical source — use that when available.
  const records: HorizonPaymentRecord[] = page.records ?? [];

  return { records, nextCursor, prevCursor };
}
