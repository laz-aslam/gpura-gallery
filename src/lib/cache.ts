/**
 * Simple in-memory cache with TTL support
 * Works great for single-instance deployments (Vercel, single container, etc.)
 */

type CacheEntry<T> = { data: T; timestamp: number };

const caches = new Map<string, Map<string, CacheEntry<unknown>>>();

export function getCache<T>(namespace: string) {
  if (!caches.has(namespace)) {
    caches.set(namespace, new Map());
  }
  const cache = caches.get(namespace)! as Map<string, CacheEntry<T>>;

  return {
    /**
     * Get cached data if it exists and is fresh
     */
    get(key: string, ttl: number): T | null {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() - entry.timestamp > ttl) {
        cache.delete(key);
        return null;
      }
      return entry.data;
    },

    /**
     * Get cached data with stale-while-revalidate support
     * Returns data even if stale (up to staleTtl), with isStale flag
     */
    getStale(
      key: string,
      freshTtl: number,
      staleTtl: number
    ): { data: T; isStale: boolean } | null {
      const entry = cache.get(key);
      if (!entry) return null;
      const age = Date.now() - entry.timestamp;
      if (age > staleTtl) {
        cache.delete(key);
        return null;
      }
      return { data: entry.data, isStale: age > freshTtl };
    },

    /**
     * Store data in cache
     */
    set(key: string, data: T): void {
      cache.set(key, { data, timestamp: Date.now() });
    },

    /**
     * Clean up expired entries when cache grows too large
     */
    cleanup(ttl: number, maxSize = 500): void {
      if (cache.size > maxSize) {
        const now = Date.now();
        for (const [k, v] of cache.entries()) {
          if (now - v.timestamp > ttl) {
            cache.delete(k);
          }
        }
      }
    },

    /**
     * Get cache size (for debugging)
     */
    size(): number {
      return cache.size;
    },
  };
}

// =============================================================================
// TTL Constants (in milliseconds)
// =============================================================================

export const CACHE_TTL = {
  /** 48 hours - main cache duration for all API responses */
  DEFAULT: 48 * 60 * 60 * 1000,

  /** 72 hours - extended window for stale-while-revalidate */
  STALE: 72 * 60 * 60 * 1000,
} as const;

// =============================================================================
// Cache-Control Header Values
// =============================================================================

export const CACHE_HEADERS = {
  /** 48 hours + 24 hours stale-while-revalidate */
  DEFAULT: "public, max-age=172800, stale-while-revalidate=86400",

  /** 7 days for static assets like PDFs (they never change) */
  STATIC: "public, max-age=604800",
} as const;

