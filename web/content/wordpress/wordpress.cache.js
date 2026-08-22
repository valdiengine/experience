/**
 * WordPress Cache
 *
 * Cache for WordPress content with domain isolation.
 * Framework-free implementation.
 */

export class WordPressCache {
  constructor(options = {}) {
    this.cache = new Map()
    this.maxSize = options.maxSize || 500
    this.defaultTtl = options.ttl || 300000
  }

  _buildKey(domain, contentType, identifier) {
    return `wp:${domain}:${contentType}:${identifier}`
  }

  get(domain, contentType, identifier) {
    const key = this._buildKey(domain, contentType, identifier)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  set(domain, contentType, identifier, value, ttl = this.defaultTtl) {
    const key = this._buildKey(domain, contentType, identifier)

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    })
  }

  invalidate(domain, contentType = null, identifier = null) {
    if (!domain) return

    const prefix = `wp:${domain}:`
    const keysToDelete = []

    for (const key of this.cache.keys()) {
      if (!key.startsWith(prefix)) continue

      if (contentType && identifier) {
        if (key === this._buildKey(domain, contentType, identifier)) {
          keysToDelete.push(key)
        }
      } else if (contentType) {
        const parts = key.split(':')
        if (parts[2] === contentType) {
          keysToDelete.push(key)
        }
      } else {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
    }

    return keysToDelete.length
  }

  invalidateAll() {
    this.cache.clear()
  }

  getStats() {
    let valid = 0
    let expired = 0

    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() > entry.expires) {
        expired++
        this.cache.delete(key)
      } else {
        valid++
      }
    }

    return {
      size: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize
    }
  }
}

export function createWordPressCache(options) {
  return new WordPressCache(options)
}

export default {
  WordPressCache,
  createWordPressCache
}
