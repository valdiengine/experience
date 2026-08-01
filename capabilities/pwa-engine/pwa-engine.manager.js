/**
 * PWA Engine Manager — Orchestrates all PWA sub-modules
 *
 * Business-agnostic: manages manifest, service worker, installation, offline, push
 * Each tenant gets independent PWA experience
 */
import { ManifestGenerator } from './manifest/manifest.generator.js'
import { ServiceWorkerManager } from './service-worker/service.worker.manager.js'
import { InstallManager } from './install/install.manager.js'
import { OfflineManager } from './offline/offline.manager.js'
import { PWA_ENGINE_EVENTS } from './pwa-engine.events.js'

export class PWAEngineManager {
  #context = null
  #manifestGenerator = null
  #serviceWorkerManager = null
  #installManager = null
  #offlineManager = null
  #initialized = false

  constructor(context) {
    this.#context = context
    this.#manifestGenerator = new ManifestGenerator(context)
    this.#serviceWorkerManager = new ServiceWorkerManager(context)
    this.#installManager = new InstallManager(context)
    this.#offlineManager = new OfflineManager(context)
  }

  /**
   * Initialize PWA for tenant
   * @param {object} tenant
   * @returns {Promise<void>}
   */
  async init(tenant) {
    if (this.#initialized) return

    const pwaConfig = tenant?.pwa || {}
    if (pwaConfig.enabled === false) return

    this.#setupPushIntegration(tenant)
    this.#setupAnalytics(tenant)

    const manifest = this.#manifestGenerator.generate(tenant)
    this.#manifestGenerator.inject(manifest)

    this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.MANIFEST_INJECTED, {
      tenantId: tenant?.id,
    })

    if (this.#serviceWorkerManager.isSupported()) {
      await this.#serviceWorkerManager.register(tenant)

      const cacheConfig = this.#buildCacheConfig(tenant)
      this.#serviceWorkerManager.getCacheStrategy().configure(tenant?.id, cacheConfig)

      const staticAssets = this.#getStaticAssets(tenant)
      if (staticAssets.length > 0) {
        await this.#serviceWorkerManager.getCacheStrategy().preCache(tenant?.id, staticAssets)
      }
    }

    this.#installManager.init(tenant)
    this.#offlineManager.init(tenant)

    this.#initialized = true
  }

  /**
   * Generate and inject manifest
   * @param {object} tenant
   */
  injectManifest(tenant) {
    const manifest = this.#manifestGenerator.generate(tenant)
    this.#manifestGenerator.inject(manifest)
  }

  /**
   * Get manifest generator
   * @returns {ManifestGenerator}
   */
  getManifestGenerator() {
    return this.#manifestGenerator
  }

  /**
   * Get service worker manager
   * @returns {ServiceWorkerManager}
   */
  getServiceWorkerManager() {
    return this.#serviceWorkerManager
  }

  /**
   * Get install manager
   * @returns {InstallManager}
   */
  getInstallManager() {
    return this.#installManager
  }

  /**
   * Get offline manager
   * @returns {OfflineManager}
   */
  getOfflineManager() {
    return this.#offlineManager
  }

  /**
   * Check if PWA is supported
   * @returns {boolean}
   */
  isSupported() {
    return this.#serviceWorkerManager.isSupported()
  }

  /**
   * Check if app is installed
   * @returns {boolean}
   */
  isInstalled() {
    return this.#installManager.isInstalled()
  }

  /**
   * Prompt installation
   * @param {string} tenantId
   * @returns {Promise<boolean>}
   */
  async promptInstall(tenantId) {
    return this.#installManager.promptInstall(tenantId)
  }

  /**
   * Clear all caches for tenant
   * @param {string} tenantId
   * @returns {Promise<boolean>}
   */
  async clearCache(tenantId) {
    return this.#serviceWorkerManager.getCacheStrategy().clearCache(tenantId)
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this.#offlineManager?.destroy()
    this.#initialized = false
  }

  // ── Private ──

  #setupPushIntegration(tenant) {
    const notifications = this.#context?.capabilities?.get?.('notifications')
    if (!notifications) return

    if ('Notification' in window && Notification.permission === 'default') {
      this.#context?.eventBus?.on(PWA_ENGINE_EVENTS.INSTALLED, async () => {
        try {
          await Notification.requestPermission()
          if (Notification.permission === 'granted') {
            this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.PUSH_PERMISSION_GRANTED, {
              tenantId: tenant?.id,
            })
          } else {
            this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.PUSH_PERMISSION_DENIED, {
              tenantId: tenant?.id,
            })
          }
        } catch {}
      })
    }
  }

  #setupAnalytics(tenant) {
    const obs = this.#context?.capabilities?.get?.('observability')
    if (!obs?.recordMetric) return

    this.#context?.eventBus?.on(PWA_ENGINE_EVENTS.INSTALLED, () => {
      obs.recordMetric({
        tenantId: tenant?.id,
        category: 'pwa',
        type: 'counter',
        name: 'installations',
        value: 1,
      })
    })

    this.#context?.eventBus?.on(PWA_ENGINE_EVENTS.PUSH_CLICKED, () => {
      obs.recordMetric({
        tenantId: tenant?.id,
        category: 'pwa',
        type: 'counter',
        name: 'notification_clicks',
        value: 1,
      })
    })

    this.#context?.eventBus?.on(PWA_ENGINE_EVENTS.OFFLINE_DETECTED, () => {
      obs.recordMetric({
        tenantId: tenant?.id,
        category: 'pwa',
        type: 'counter',
        name: 'offline_usage',
        value: 1,
      })
    })
  }

  #buildCacheConfig(tenant) {
    return {
      cacheName: `tenant-cache-${tenant?.slug || 'default'}-v1`,
      staticAssets: this.#getStaticAssets(tenant),
      publicPages: this.#getPublicPages(tenant),
      images: [],
      offlineFallback: '/offline.html',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      maxEntries: 100,
    }
  }

  #getStaticAssets(tenant) {
    const assets = [
      '/',
      '/index.html',
      '/offline.html',
      '/styles.css',
      '/app.js',
    ]

    const pwaConfig = tenant?.pwa || {}
    if (pwaConfig.staticAssets) {
      assets.push(...pwaConfig.staticAssets)
    }

    return assets
  }

  #getPublicPages(tenant) {
    const pages = [
      '/',
      '/home',
      '/services',
      '/gallery',
      '/contact',
      '/about',
    ]

    const public_ = this.#context?.capabilities?.get?.('public')
    if (public_?.getRoutes) {
      const routes = public_.getRoutes()
      routes.forEach((config, path) => {
        if (config.visibility !== 'private') {
          pages.push(path)
        }
      })
    }

    return pages
  }
}
