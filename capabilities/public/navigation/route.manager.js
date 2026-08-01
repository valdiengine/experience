/**
 * Route Manager — Tenant-aware route resolution
 *
 * Business-agnostic: resolves routes for public pages
 * Supports: /tenant/slug, hash-based, query params
 */
import { PUBLIC_EVENTS } from '../public.events.js'

export class RouteManager {
  #context = null
  #routes = new Map()
  #currentRoute = null
  #tenantPrefix = ''
  #listeners = new Set()

  constructor(context) {
    this.#context = context
  }

  /**
   * Initialize route manager with tenant prefix
   * @param {object} options - { tenantPrefix }
   */
  init(options = {}) {
    this.#tenantPrefix = options.tenantPrefix || ''
    this.#bindHashListener()
    this.#resolveInitialRoute()
  }

  /**
   * Register a route
   * @param {string} path
   * @param {object} config - { pageId, title, visibility }
   */
  registerRoute(path, config = {}) {
    const fullPath = this.#tenantPrefix ? `${this.#tenantPrefix}/${path}` : path
    this.#routes.set(fullPath, config)
    this.#routes.set(path, config)
  }

  /**
   * Register multiple routes
   * @param {object} routesMap - { path: config }
   */
  registerRoutes(routesMap) {
    Object.entries(routesMap).forEach(([path, config]) => {
      this.registerRoute(path, config)
    })
  }

  /**
   * Navigate to a route
   * @param {string} path
   * @param {object} options - { replace }
   */
  navigate(path, options = {}) {
    const hash = `#${path}`
    if (options.replace) {
      history.replaceState(null, '', hash)
    } else {
      history.pushState(null, '', hash)
    }
    this.#resolveRoute(path)
  }

  /**
   * Get current route
   * @returns {object|null} - { path, config }
   */
  getCurrent() {
    return this.#currentRoute
  }

  /**
   * Get current path
   * @returns {string}
   */
  getCurrentPath() {
    return this.#currentRoute?.path || ''
  }

  /**
   * Subscribe to route changes
   * @param {Function} fn
   * @returns {Function} unsubscribe
   */
  onRouteChange(fn) {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  /**
   * Resolve tenant slug from URL
   * @returns {string|null}
   */
  resolveTenantSlug() {
    const path = window.location.pathname
    const hash = window.location.hash.slice(1)
    const full = hash || path

    if (this.#tenantPrefix && full.startsWith(this.#tenantPrefix)) {
      const remainder = full.slice(this.#tenantPrefix.length + 1)
      const segments = remainder.split('/').filter(Boolean)
      if (segments.length > 0) return segments[0]
    }

    const hostParts = window.location.hostname.split('.')
    if (hostParts.length > 2) return hostParts[0]

    return null
  }

  /**
   * Build a URL for a tenant page
   * @param {string} tenantSlug
   * @param {string} pageSlug
   * @returns {string}
   */
  buildURL(tenantSlug, pageSlug) {
    const base = this.#tenantPrefix ? `/${this.#tenantPrefix}` : ''
    return `${base}/${tenantSlug}/${pageSlug || ''}`
  }

  /**
   * Get all registered routes
   * @returns {Map}
   */
  getRoutes() {
    return new Map(this.#routes)
  }

  // ── Private ──

  #bindHashListener() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1) || 'home'
      this.#resolveRoute(hash)
    })
  }

  #resolveInitialRoute() {
    const hash = window.location.hash.slice(1)
    if (hash) {
      this.#resolveRoute(hash)
    }
  }

  #resolveRoute(path) {
    const config = this.#routes.get(path) || { pageId: path, title: path }

    this.#currentRoute = { path, config }

    this.#listeners.forEach(fn => fn({ path, config }))
    this.#context?.eventBus?.emit(PUBLIC_EVENTS.ROUTE_CHANGED, { path, config })
  }
}
