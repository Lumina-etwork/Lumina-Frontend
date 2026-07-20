export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keyCount: number;
  memoryEstimateBytes: number;
  evictions: number;
}

export class CacheMonitor {
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  recordEviction(): void {
    this.evictions++;
  }

  snapshot(keys: number, memEstimate: number): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      keyCount: keys,
      memoryEstimateBytes: memEstimate,
      evictions: this.evictions,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
}
