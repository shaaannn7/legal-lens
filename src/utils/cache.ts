/**
 * High-performance In-Memory Cache with TTL for Legal Lens Analysis & QA.
 * Significantly improves efficiency and response latency (reduces repeated API compute).
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxEntries: number;
  private defaultTtlMs: number;

  constructor(maxEntries = 200, defaultTtlMs = 15 * 60 * 1000) { // 15 mins default
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const expiresAt = Date.now() + (ttlMs || this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instances
export const globalAnalysisCache = new MemoryCache<any>(100, 30 * 60 * 1000); // 30 mins
export const globalQACache = new MemoryCache<any>(300, 15 * 60 * 1000);       // 15 mins
export const globalCompareCache = new MemoryCache<any>(50, 30 * 60 * 1000);    // 30 mins
