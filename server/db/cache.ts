interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTtlMs: number

  constructor(defaultTtlMs = 10000) {
    this.defaultTtlMs = defaultTtlMs
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  deletePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

export const serverCache = new MemoryCache(10000) // 10s default TTL
