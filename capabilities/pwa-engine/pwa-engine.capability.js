/**
 * PWA Engine Capability — v1.0.0
 *
 * Complete Progressive Web App engine for multi-tenant SaaS
 * Manages: manifest, service worker, installation, offline, push notifications
 *
 * Dependencies: notifications, communication, public, observability
 */
import { BaseCapability } from '../core/base.capability.js'
import { PWAEngineManager } from './pwa-engine.manager.js'
import { PWA_ENGINE_EVENTS } from './pwa-engine.events.js'

export class PWAEngineCapability extends BaseCapability {
  static id = 'pwa-engine'
  static name = 'PWA Engine'
  static version = '1.0.0'
  static dependencies = ['notifications', 'communication', 'public', 'observability']

  #manager = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new PWAEngineManager(context)
  }

  async activate() {
    const tenant = this.context?.tenant
    if (tenant) {
      await this.#manager.init(tenant)
    }
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#manager?.destroy()
    this.#manager = null
    await super.destroy()
  }

  /**
   * Generate and inject manifest for tenant
   * @param {object} tenant
   */
  injectManifest(tenant) {
    this.#manager?.injectManifest(tenant)
  }

  /**
   * Get PWA manager
   * @returns {PWAEngineManager}
   */
  getManager() {
    return this.#manager
  }

  /**
   * Get manifest generator
   * @returns {ManifestGenerator}
   */
  getManifestGenerator() {
    return this.#manager?.getManifestGenerator()
  }

  /**
   * Get service worker manager
   * @returns {ServiceWorkerManager}
   */
  getServiceWorkerManager() {
    return this.#manager?.getServiceWorkerManager()
  }

  /**
   * Get install manager
   * @returns {InstallManager}
   */
  getInstallManager() {
    return this.#manager?.getInstallManager()
  }

  /**
   * Get offline manager
   * @returns {OfflineManager}
   */
  getOfflineManager() {
    return this.#manager?.getOfflineManager()
  }

  /**
   * Check if PWA is supported
   * @returns {boolean}
   */
  isSupported() {
    return this.#manager?.isSupported() || false
  }

  /**
   * Check if app is installed
   * @returns {boolean}
   */
  isInstalled() {
    return this.#manager?.isInstalled() || false
  }

  /**
   * Prompt installation
   * @param {string} tenantId
   * @returns {Promise<boolean>}
   */
  async promptInstall(tenantId) {
    return this.#manager?.promptInstall(tenantId) || false
  }

  /**
   * Check if app can be installed
   * @returns {boolean}
   */
  canInstall() {
    return this.#manager?.getInstallManager()?.canInstall() || false
  }

  /**
   * Get install state
   * @param {string} tenantId
   * @returns {string}
   */
  getInstallState(tenantId) {
    return this.#manager?.getInstallManager()?.getState(tenantId) || 'unknown'
  }

  /**
   * Check if currently online
   * @returns {boolean}
   */
  isOnline() {
    return this.#manager?.getOfflineManager()?.isOnline() ?? navigator.onLine
  }

  /**
   * Check if page is available offline
   * @param {string} path
   * @returns {boolean}
   */
  isAvailableOffline(path) {
    return this.#manager?.getOfflineManager()?.isAvailableOffline(path) || false
  }

  /**
   * Register page for offline access
   * @param {string} path
   * @param {string} html
   */
  registerOfflinePage(path, html) {
    this.#manager?.getOfflineManager()?.registerOfflinePage(path, html)
  }

  /**
   * Clear all caches
   * @param {string} tenantId
   * @returns {Promise<boolean>}
   */
  async clearCache(tenantId) {
    return this.#manager?.clearCache(tenantId) || false
  }

  /**
   * Update service worker
   * @returns {Promise<boolean>}
   */
  async updateServiceWorker() {
    return this.#manager?.getServiceWorkerManager()?.update() || false
  }
}
