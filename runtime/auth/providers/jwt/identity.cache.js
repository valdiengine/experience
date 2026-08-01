const DEFAULT_TTL = 300000
const MAX_ENTRIES = 10000
const CLEANUP_INTERVAL = 60000

export class IdentityCache {
  #cache = new Map()
  #ttl = DEFAULT_TTL
  #maxEntries = MAX_ENTRIES
  #hits = 0
  #misses = 0
  #lastCleanup = Date.now()

  constructor(config = {}) {
    this.#ttl = config.cacheTTL || DEFAULT_TTL
    this.#maxEntries = config.maxCacheEntries || MAX_ENTRIES
  }

  get(key) {
    const entry = this.#cache.get(key)
    if (!entry) {
      this.#misses++
      return null
    }
    if (Date.now() > entry.expiresAt) {
      this.#cache.delete(key)
      this.#misses++
      return null
    }
    this.#hits++
    entry.lastAccessed = Date.now()
    return entry.data
  }

  set(key, data, ttl = null) {
    this.#maybeCleanup()
    if (this.#cache.size >= this.#maxEntries) {
      this.#evict()
    }
    this.#cache.set(key, {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttl || this.#ttl),
      lastAccessed: Date.now(),
    })
  }

  invalidate(key) {
    this.#cache.delete(key)
  }

  invalidatePattern(prefix) {
    for (const key of this.#cache.keys()) {
      if (key.startsWith(prefix)) {
        this.#cache.delete(key)
      }
    }
  }

  invalidateAll() {
    this.#cache.clear()
  }

  getStats() {
    const total = this.#hits + this.#misses
    return {
      size: this.#cache.size,
      hits: this.#hits,
      misses: this.#misses,
      hitRate: total > 0 ? (this.#hits / total) : 0,
      maxEntries: this.#maxEntries,
      ttl: this.#ttl,
    }
  }

  health() {
    return {
      status: this.#cache.size <= this.#maxEntries ? 'healthy' : 'degraded',
      size: this.#cache.size,
      maxEntries: this.#maxEntries,
      hitRate: this.getStats().hitRate,
      timestamp: Date.now(),
    }
  }

  available() {
    return true
  }

  supports(feature) {
    const features = ['get', 'set', 'invalidate', 'invalidate-pattern', 'invalidate-all', 'ttl', 'stats', 'hit-rate', 'max-entries', 'auto-cleanup']
    return features.includes(feature)
  }

  #maybeCleanup() {
    if (Date.now() - this.#lastCleanup < CLEANUP_INTERVAL) return
    this.#lastCleanup = Date.now()
    const now = Date.now()
    for (const [key, entry] of this.#cache) {
      if (now > entry.expiresAt) {
        this.#cache.delete(key)
      }
    }
  }

  #evict() {
    let oldest = null
    let oldestKey = null
    for (const [key, entry] of this.#cache) {
      if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
        oldest = entry
        oldestKey = key
      }
    }
    if (oldestKey) {
      this.#cache.delete(oldestKey)
    }
  }
}

export default IdentityCache
