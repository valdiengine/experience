/**
 * Web Cache
 *
 * Cache key generation and cache abstraction for public web delivery.
 * Framework-free implementation.
 */

export function createCacheKey(options = {}) {
  const { domain, destination, experience, locale, path } = options

  const parts = ['web']

  if (domain) {
    parts.push(domain)
  }

  if (destination) {
    parts.push(destination)
  }

  if (experience) {
    parts.push(experience)
  }

  if (locale) {
    parts.push(locale)
  }

  if (path) {
    parts.push(path.replace(/^\//, ''))
  }

  return parts.join(':')
}

export class WebCache {
  constructor(options = {}) {
    this.cache = new Map()
    this.maxSize = options.maxSize || 1000
    this.ttl = options.ttl || 60000
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  set(key, value, ttl = this.ttl) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    })
  }

  has(key) {
    return this.get(key) !== null
  }

  delete(key) {
    return this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  invalidateByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  invalidateDomain(domain) {
    this.invalidateByPrefix(`web:${domain}`)
  }

  invalidateDestination(destination) {
    for (const key of this.cache.keys()) {
      const parts = key.split(':')
      if (parts.includes(destination)) {
        this.cache.delete(key)
      }
    }
  }
}

export function createWebCache(options = {}) {
  return new WebCache(options)
}

export default {
  createCacheKey,
  WebCache,
  createWebCache
}
