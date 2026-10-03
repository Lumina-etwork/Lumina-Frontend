import type { Asset, Escrow, Health, MatchRequest, RankedCandidate, BlindCandidate } from './types';

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000').replace(
  /\/$/,
  '',
);

export function streamUrl(): string {
  const url = new URL('/stream', API_BASE);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const getHealth = () => request<Health>('/health');
export const getAssets = () => request<Asset[]>('/api/assets');
export const getEscrows = () => request<Escrow[]>('/api/escrows');
export const getBlindPool = () => request<BlindCandidate[]>('/api/creators/blind-pool');
export const matchCandidates = (body: MatchRequest) =>
  request<RankedCandidate[]>('/api/match', {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** Shorten a Stellar address for display: `GCPX5HHW…VULF`. */
export function truncateAddress(address: string, size = 6): string {
  if (!address || address.length <= size * 2 + 1) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}

/** Render stroops-as-string amounts without losing precision. */
export function formatAmount(amount: string | number): string {
  const value = typeof amount === 'string' ? amount : String(amount);
  if (!/^-?\d+$/.test(value)) return value;
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
