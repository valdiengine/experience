/**
 * Cache Strategy — Tenant-isolated caching strategies
 *
 * Business-agnostic: implements cache-first, network-first, stale-while-revalidate
 * Each tenant has isolated cache (tenant-cache-{slug}-v1)
 * Never caches private reservation data
 */
import { CACHE_STRATEGY } from '../pwa-engine.schema.js'
import { PWA_ENGINE_EVENTS } from '../pwa-engine.events.js'

export class CacheStrategy {
  #context = null
  #cacheConfigs = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Configure cache for a tenant
   * @param {string} tenantId
   * @param {object} config - { cacheName, staticAssets, publicPages, images, maxAge, maxEntries }
   */
  configure(tenantId, config = {}) {
    this.#cacheConfigs.set(tenantId, {
      cacheName: config.cacheName || `tenant-cache-${tenantId}-v1`,
      staticAssets: config.staticAssets || [],
      publicPages: config.publicPages || [],
      images: config.images || [],
      offlineFallback: config.offlineFallback || '/offline.html',
      maxAge: config.maxAge || 7 * 24 * 60 * 60 * 1000, // 7 days
      maxEntries: config.maxEntries || 100,
    })
  }

  /**
   * Get cache name for tenant
   * @param {string} tenantId
   * @returns {string}
   */
  getCacheName(tenantId) {
    return this.#cacheConfigs.get(tenantId)?.cacheName || `tenant-cache-${tenantId}-v1`
  }

  /**
   * Pre-cache static assets for tenant
   * @param {string} tenantId
   * @param {string[]} urls
   * @returns {Promise<void>}
   */
  async preCache(tenantId, urls) {
    const cacheName = this.getCacheName(tenantId)
    const cache = await caches.open(cacheName)
    await cache.addAll(urls)

    this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.CACHE_UPDATED, {
      tenantId,
      cacheName,
      urlCount: urls.length,
    })
  }

  /**
   * Cache a single URL
   * @param {string} tenantId
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async cacheURL(tenantId, url) {
    try {
      const cacheName = this.getCacheName(tenantId)
      const cache = await caches.open(cacheName)
      const response = await fetch(url)
      if (response.ok) {
        await cache.put(url, response)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * Apply cache-first strategy
   * @param {Request} request
   * @param {string} tenantId
   * @returns {Promise<Response>}
   */
  async cacheFirst(request, tenantId) {
    const cacheName = this.getCacheName(tenantId)
    const cached = await caches.match(request)
    if (cached) return cached

    try {
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(cacheName)
        await cache.put(request, response.clone())
      }
      return response
    } catch {
      return this.#getOfflineFallback(tenantId)
    }
  }

  /**
   * Apply network-first strategy
   * @param {Request} request
   * @param {string} tenantId
   * @returns {Promise<Response>}
   */
  async networkFirst(request, tenantId) {
    try {
      const response = await fetch(request)
      if (response.ok) {
        const cacheName = this.getCacheName(tenantId)
        const cache = await caches.open(cacheName)
        await cache.put(request, response.clone())
      }
      return response
    } catch {
      const cached = await caches.match(request)
      if (cached) return cached
      return this.#getOfflineFallback(tenantId)
    }
  }

  /**
   * Apply stale-while-revalidate strategy
   * @param {Request} request
   * @param {string} tenantId
   * @returns {Promise<Response>}
   */
  async staleWhileRevalidate(request, tenantId) {
    const cacheName = this.getCacheName(tenantId)
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)

    const fetchPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    }).catch(() => cached || this.#getOfflineFallback(tenantId))

    return cached || fetchPromise
  }

  /**
   * Clear cache for tenant
   * @param {string} tenantId
   * @returns {Promise<boolean>}
   */
  async clearCache(tenantId) {
    const cacheName = this.getCacheName(tenantId)
    const success = await caches.delete(cacheName)

    if (success) {
      this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.CACHE_CLEARED, {
        tenantId,
        cacheName,
      })
    }

    return success
  }

  /**
   * Get cache size
   * @param {string} tenantId
   * @returns {Promise<number>}
   */
  async getCacheSize(tenantId) {
    const cacheName = this.getCacheName(tenantId)
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    return keys.length
  }

  /**
   * Clean old entries from cache
   * @param {string} tenantId
   * @returns {Promise<number>} - Number of entries removed
   */
  async cleanOldEntries(tenantId) {
    const config = this.#cacheConfigs.get(tenantId)
    if (!config) return 0

    const cacheName = config.cacheName
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    const now = Date.now()
    let removed = 0

    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const dateHeader = response.headers.get('date')
        if (dateHeader) {
          const age = now - new Date(dateHeader).getTime()
          if (age > config.maxAge) {
            await cache.delete(request)
            removed++
          }
        }
      }

      if (keys.length - removed > config.maxEntries) {
        await cache.delete(request)
        removed++
      }
    }

    return removed
  }

  /**
   * Check if request is public (safe to cache)
   * @param {Request} request
   * @returns {boolean}
   */
  isPublicRequest(request) {
    const url = new URL(request.url)
    const privatePatterns = ['/api/reservations', '/api/customers', '/api/payments', '/admin/']
    return !privatePatterns.some(p => url.pathname.includes(p))
  }

  // ── Private ──

  async #getOfflineFallback(tenantId) {
    const config = this.#cacheConfigs.get(tenantId)
    const fallbackURL = config?.offlineFallback || '/offline.html'

    const cached = await caches.match(fallbackURL)
    if (cached) return cached

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}
