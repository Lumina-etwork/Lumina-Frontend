"use client";

import type { QueryClient } from "@tanstack/react-query";
import { CacheMonitor, type CacheStats } from "./cacheMonitor";
import { getTTLForGroup } from "./ttlConfig";
import { groupOfKey } from "../invalidationRegistry";

interface CacheEntry {
  value: unknown;
  expiresAt: number | null;
  createdAt: number;
}

export class RedisCache {
  private store = new Map<string, CacheEntry>();
  private monitor = new CacheMonitor();
  private queryClient: QueryClient | null = null;
  private evictionCount = 0;

  constructor(queryClient?: QueryClient) {
    this.queryClient = queryClient ?? null;
  }

  setQueryClient(qc: QueryClient): void {
    this.queryClient = qc;
  }

  get<T = unknown>(key: string): T | null {
    this.evictExpired();
    const entry = this.store.get(key);
    if (!entry) {
      this.monitor.recordMiss();
      return null;
    }
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.monitor.recordMiss();
      this.monitor.recordEviction();
      return null;
    }
    this.monitor.recordHit();
    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, ttlMs?: number): boolean {
    try {
      const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : null;
      this.store.set(key, {
        value,
        expiresAt,
        createdAt: Date.now(),
      });

      if (this.queryClient) {
        const group = groupOfKey([key]) ?? key;
        this.queryClient.setQueryData([group, key], value);
      }

      return true;
    } catch {
      return false;
    }
  }

  del(key: string): boolean {
    const existed = this.store.has(key);
    this.store.delete(key);
    if (existed && this.queryClient) {
      const group = groupOfKey([key]) ?? key;
      this.queryClient.removeQueries({ queryKey: [group, key] });
    }
    return existed;
  }

  ttl(key: string): number {
    this.evictExpired();
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    const remaining = Math.max(0, entry.expiresAt - Date.now());
    return Math.ceil(remaining / 1000);
  }

  expire(key: string, ttlMs: number): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    entry.expiresAt = Date.now() + ttlMs;
    return true;
  }

  exists(key: string): boolean {
    this.evictExpired();
    return this.store.has(key);
  }

  keys(pattern?: string): string[] {
    this.evictExpired();
    const all = [...this.store.keys()];
    if (!pattern) return all;
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return all.filter((k) => regex.test(k));
  }

  flushAll(): void {
    this.store.clear();
    this.monitor.reset();
    this.evictionCount = 0;
  }

  flushGroup(group: string): void {
    this.evictExpired();
    const prefix = `${group}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix) || key === group) {
        this.store.delete(key);
      }
    }
  }

  mget<T = unknown>(...keys: string[]): (T | null)[] {
    return keys.map((k) => this.get<T>(k));
  }

  mset(entries: Record<string, unknown>, ttlMs?: number): boolean {
    try {
      for (const [key, value] of Object.entries(entries)) {
        this.set(key, value, ttlMs);
      }
      return true;
    } catch {
      return false;
    }
  }

  stats(): CacheStats {
    this.evictExpired();
    return this.monitor.snapshot(
      this.store.size,
      this.estimateMemory(),
    );
  }

  getMonitor(): CacheMonitor {
    return this.monitor;
  }

  get size(): number {
    this.evictExpired();
    return this.store.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.store.delete(key);
        this.evictionCount++;
        this.monitor.recordEviction();
      }
    }
  }

  private estimateMemory(): number {
    let total = 0;
    for (const [key, entry] of this.store) {
      total += key.length * 2;
      total += JSON.stringify(entry.value).length * 2;
      total += 16;
    }
    return total;
  }

  static createWithGroupTTL(
    group: string,
    queryClient?: QueryClient,
    customTTL?: number,
  ): RedisCache {
    const ttl = customTTL ?? getTTLForGroup(group);
    const cache = new RedisCache(queryClient);
    const originalSet = cache.set.bind(cache);
    cache.set = <T>(key: string, value: T, _ttlMs?: number) =>
      originalSet(key, value, _ttlMs ?? ttl);
    return cache;
  }
}
