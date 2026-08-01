/**
 * Offline Manager — Offline experience management
 *
 * Business-agnostic: provides offline access to public content
 * Shows offline fallback page when network unavailable
 * Never exposes private reservation data offline
 */
import { PWA_ENGINE_EVENTS } from '../pwa-engine.events.js'

const PUBLIC_OFFLINE_PAGES = ['/', '/home', '/services', '/gallery', '/contact', '/about']

export class OfflineManager {
  #context = null
  #isOnline = navigator.onLine
  #offlinePages = new Map()
  #listeners = new Set()

  constructor(context) {
    this.#context = context
    this.#setupListeners()
  }

  /**
   * Initialize offline manager for tenant
   * @param {object} tenant
   */
  init(tenant) {
    this.#loadOfflinePages(tenant)
    this.#createOfflinePage(tenant)
  }

  /**
   * Check if currently online
   * @returns {boolean}
   */
  isOnline() {
    return this.#isOnline
  }

  /**
   * Check if a page is available offline
   * @param {string} path
   * @returns {boolean}
   */
  isAvailableOffline(path) {
    return this.#offlinePages.has(path) || PUBLIC_OFFLINE_PAGES.includes(path)
  }

  /**
   * Get offline page HTML
   * @param {string} path
   * @param {object} tenant
   * @returns {string}
   */
  getOfflinePage(path, tenant) {
    return this.#buildOfflineHTML(tenant)
  }

  /**
   * Show offline fallback
   * @param {object} tenant
   */
  showOfflineFallback(tenant) {
    const html = this.#buildOfflineHTML(tenant)
    document.documentElement.innerHTML = html

    this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.OFFLINE_PAGE_SHOWN, {
      tenantId: tenant?.id,
      timestamp: Date.now(),
    })
  }

  /**
   * Register a page for offline access
   * @param {string} path
   * @param {string} html
   */
  registerOfflinePage(path, html) {
    this.#offlinePages.set(path, html)
  }

  /**
   * Get list of offline-available pages
   * @returns {string[]}
   */
  getOfflinePages() {
    return [...PUBLIC_OFFLINE_PAGES, ...Array.from(this.#offlinePages.keys())]
  }

  /**
   * Subscribe to online/offline changes
   * @param {Function} fn
   * @returns {Function} unsubscribe
   */
  onStatusChange(fn) {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    window.removeEventListener('online', this.#onOnline)
    window.removeEventListener('offline', this.#onOffline)
    this.#listeners.clear()
  }

  // ── Private ──

  #setupListeners() {
    this.#onOnline = () => this.#handleOnline()
    this.#onOffline = () => this.#handleOffline()

    window.addEventListener('online', this.#onOnline)
    window.addEventListener('offline', this.#onOffline)
  }

  #handleOnline() {
    this.#isOnline = true
    this.#notifyListeners(true)

    this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.OFFLINE_RESTORED, {
      timestamp: Date.now(),
    })
  }

  #handleOffline() {
    this.#isOnline = false
    this.#notifyListeners(false)

    this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.OFFLINE_DETECTED, {
      timestamp: Date.now(),
    })
  }

  #notifyListeners(online) {
    this.#listeners.forEach(fn => {
      try { fn(online) } catch {}
    })
  }

  #loadOfflinePages(tenant) {
    const pwaConfig = tenant?.pwa || {}
    if (pwaConfig.offlinePages) {
      pwaConfig.offlinePages.forEach(page => {
        this.#offlinePages.set(page.path, page.html || '')
      })
    }
  }

  #createOfflinePage(tenant) {
    const html = this.#buildOfflineHTML(tenant)
    this.registerOfflinePage('/offline', html)
  }

  #buildOfflineHTML(tenant) {
    const name = tenant?.name || tenant?.branding?.name || 'Valdi App'
    const theme = tenant?.theme || {}
    const primaryColor = theme.primary || '#c8956c'
    const bgColor = theme.background || '#0a0a0a'

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sin conexión - ${name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: ${bgColor};
      color: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      text-align: center;
    }
    .offline-container {
      max-width: 400px;
      padding: 2rem;
    }
    .offline-icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
    }
    .offline-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: ${primaryColor};
    }
    .offline-message {
      color: #999;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .offline-retry {
      background: ${primaryColor};
      color: #000;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .offline-retry:hover { opacity: 0.9; }
    .offline-pages {
      margin-top: 2rem;
      text-align: left;
    }
    .offline-pages h3 {
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 0.5rem;
    }
    .offline-pages a {
      display: block;
      color: ${primaryColor};
      text-decoration: none;
      padding: 0.25rem 0;
    }
  </style>
</head>
<body>
  <div class="offline-container">
    <div class="offline-icon">📡</div>
    <h1 class="offline-title">Sin conexión a internet</h1>
    <p class="offline-message">
      No se puede cargar el contenido en este momento.
      Por favor, revisa tu conexión a internet e intenta nuevamente.
    </p>
    <button class="offline-retry" onclick="window.location.reload()">
      Reintentar
    </button>
    <div class="offline-pages">
      <h3>Páginas disponibles sin conexión:</h3>
      <a href="/home">Inicio</a>
      <a href="/services">Servicios</a>
      <a href="/gallery">Galería</a>
      <a href="/contact">Contacto</a>
    </div>
  </div>
</body>
</html>`
  }
}
