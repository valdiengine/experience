/**
 * Service Worker Manager — Tenant-scoped service worker registration
 *
 * Business-agnostic: registers and manages service workers per tenant
 * Each tenant has isolated cache (tenant-cache-{slug}-v1)
 */
import { PWA_ENGINE_EVENTS } from '../pwa-engine.events.js'
import { CacheStrategy } from './cache.strategy.js'

export class ServiceWorkerManager {
  #context = null
  #registration = null
  #tenant = null
  #cacheStrategy = null

  constructor(context) {
    this.#context = context
    this.#cacheStrategy = new CacheStrategy(context)
  }

  /**
   * Register service worker for tenant
   * @param {object} tenant
   * @returns {Promise<boolean>}
   */
  async register(tenant) {
    if (!navigator.serviceWorker) {
      this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.SW_ERROR, {
        tenantId: tenant?.id,
        error: 'Service Worker not supported',
      })
      return false
    }

    this.#tenant = tenant
    const swURL = this.#getServiceWorkerURL(tenant)

    try {
      this.#registration = await navigator.serviceWorker.register(swURL, {
        scope: this.#getScope(tenant),
      })

      this.#registration.addEventListener('updatefound', () => {
        this.#onUpdateFound()
      })

      this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.SW_REGISTERED, {
        tenantId: tenant?.id,
        scope: this.#getScope(tenant),
      })

      return true
    } catch (error) {
      this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.SW_ERROR, {
        tenantId: tenant?.id,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Unregister service worker for tenant
   * @returns {Promise<boolean>}
   */
  async unregister() {
    if (!this.#registration) return false

    try {
      await this.#registration.unregister()
      this.#registration = null
      return true
    } catch {
      return false
    }
  }

  /**
   * Update service worker
   * @returns {Promise<boolean>}
   */
  async update() {
    if (!this.#registration) return false

    try {
      await this.#registration.update()
      return true
    } catch {
      return false
    }
  }

  /**
   * Skip waiting and activate new service worker
   * @returns {Promise<void>}
   */
  async skipWaiting() {
    if (!this.#registration?.waiting) return
    this.#registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  /**
   * Get cache manager
   * @returns {CacheStrategy}
   */
  getCacheStrategy() {
    return this.#cacheStrategy
  }

  /**
   * Get current registration
   * @returns {ServiceWorkerRegistration|null}
   */
  getRegistration() {
    return this.#registration
  }

  /**
   * Check if service worker is supported
   * @returns {boolean}
   */
  isSupported() {
    return 'serviceWorker' in navigator
  }

  /**
   * Get tenant cache name
   * @param {string} tenantSlug
   * @returns {string}
   */
  getCacheName(tenantSlug) {
    return `tenant-cache-${tenantSlug || 'default'}-v1`
  }

  // ── Private ──

  #getServiceWorkerURL(tenant) {
    const slug = tenant?.slug || 'default'
    return `/sw-${slug}.js`
  }

  #getScope(tenant) {
    const slug = tenant?.slug
    if (!slug) return '/'

    const host = window.location.hostname
    if (host.includes(slug)) return '/'

    return `/${slug}/`
  }

  #onUpdateFound() {
    const newWorker = this.#registration?.installing
    if (!newWorker) return

    newWorker.addEventListener('statechange', (event) => {
      if (event.target.state === 'activated') {
        this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.SW_ACTIVATED, {
          tenantId: this.#tenant?.id,
        })
      }
    })

    this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.SW_UPDATE_AVAILABLE, {
      tenantId: this.#tenant?.id,
    })
  }
}
