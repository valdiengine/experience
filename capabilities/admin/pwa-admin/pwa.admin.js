/**
 * PWA Admin — PWA administration through PWA Engine
 *
 * Business-agnostic: manages app name, icons, colors, installation stats, push permissions
 */
import { ADMIN_EVENTS } from '../admin.events.js'

export class PWAAdmin {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Get PWA dashboard data
   * @param {string} tenantId
   * @returns {object}
   */
  async getDashboard(tenantId) {
    const pwaEngine = this.#context?.capabilities?.get?.('pwa-engine')
    const tenant = await this.#getTenant(tenantId)

    return {
      config: await this.getConfig(tenantId),
      stats: await this.getStats(tenantId),
      isSupported: pwaEngine?.isSupported() || false,
      isInstalled: pwaEngine?.isInstalled() || false,
      canInstall: pwaEngine?.canInstall() || false,
    }
  }

  /**
   * Get PWA configuration
   * @param {string} tenantId
   * @returns {object}
   */
  async getConfig(tenantId) {
    const tenant = await this.#getTenant(tenantId)
    const pwa = tenant?.pwa || {}

    return {
      enabled: pwa.enabled || false,
      name: pwa.name || tenant?.name || 'Valdi App',
      shortName: pwa.shortName || tenant?.shortName || 'Valdi',
      icons: pwa.icons || [],
      themeColor: pwa.themeColor || tenant?.theme?.primary || '#c8956c',
      backgroundColor: pwa.backgroundColor || tenant?.theme?.background || '#0a0a0a',
      display: pwa.display || 'standalone',
      offline: pwa.offline !== false,
      push: pwa.push || false,
      orientation: pwa.orientation || 'any',
    }
  }

  /**
   * Update PWA configuration
   * @param {string} tenantId
   * @param {object} config - { name, shortName, icons, themeColor, backgroundColor, offline, push }
   * @returns {object}
   */
  async updateConfig(tenantId, config) {
    const tenantSettings = this.#context?.capabilities?.get?.('admin')?.getManager?.()?.tenantSettings
    if (!tenantSettings) {
      return { success: false, error: 'Admin manager not available' }
    }

    return tenantSettings.updatePWAConfig(tenantId, config)
  }

  /**
   * Get installation statistics
   * @param {string} tenantId
   * @returns {object}
   */
  async getStats(tenantId) {
    const pwaEngine = this.#context?.capabilities?.get?.('pwa-engine')
    const installManager = pwaEngine?.getInstallManager()

    return {
      isInstalled: pwaEngine?.isInstalled() || false,
      installState: installManager?.getState(tenantId) || 'unknown',
      canInstall: pwaEngine?.canInstall() || false,
      platform: installManager?.getInstallationInfo(tenantId)?.platform || 'unknown',
    }
  }

  /**
   * Prompt installation
   * @param {string} tenantId
   * @returns {Promise<boolean>}
   */
  async promptInstall(tenantId) {
    const pwaEngine = this.#context?.capabilities?.get?.('pwa-engine')
    if (!pwaEngine?.promptInstall) return false
    return pwaEngine.promptInstall(tenantId)
  }

  /**
   * Get push permission status
   * @returns {string}
   */
  getPushPermission() {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  }

  /**
   * Request push permission
   * @returns {Promise<string>}
   */
  async requestPushPermission() {
    if (!('Notification' in window)) return 'unsupported'
    const result = await Notification.requestPermission()
    return result
  }

  /**
   * Clear PWA cache
   * @param {string} tenantId
   * @returns {Promise<boolean>}
   */
  async clearCache(tenantId) {
    const pwaEngine = this.#context?.capabilities?.get?.('pwa-engine')
    if (!pwaEngine?.clearCache) return false
    return pwaEngine.clearCache(tenantId)
  }

  /**
   * Update service worker
   * @returns {Promise<boolean>}
   */
  async updateServiceWorker() {
    const pwaEngine = this.#context?.capabilities?.get?.('pwa-engine')
    if (!pwaEngine?.updateServiceWorker) return false
    return pwaEngine.updateServiceWorker()
  }

  /**
   * Get offline available pages
   * @returns {string[]}
   */
  getOfflinePages() {
    const pwaEngine = this.#context?.capabilities?.get?.('pwa-engine')
    if (!pwaEngine?.getOfflineManager) return []
    return pwaEngine.getOfflineManager()?.getOfflinePages() || []
  }

  // ── Private ──

  async #getTenant(tenantId) {
    const onboarding = this.#context?.capabilities?.get?.('onboarding')
    if (onboarding?.getTenant) return onboarding.getTenant(tenantId)
    return this.#context?.tenant || null
  }
}
