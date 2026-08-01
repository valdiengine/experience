/**
 * Install Manager — PWA installation flow management
 *
 * Business-agnostic: detects beforeinstallprompt, tracks installation state
 * Emits events through EventBus for observability
 */
import { PWA_INSTALL_STATE } from '../pwa-engine.schema.js'
import { PWA_ENGINE_EVENTS } from '../pwa-engine.events.js'

export class InstallManager {
  #context = null
  #deferredPrompt = null
  #state = PWA_INSTALL_STATE.UNKNOWN
  #installations = new Map()

  constructor(context) {
    this.#context = context
    this.#setupListeners()
  }

  /**
   * Initialize install manager for tenant
   * @param {object} tenant
   */
  init(tenant) {
    this.#loadState(tenant?.id)
    this.#checkInstallability()
  }

  /**
   * Check if app is installable
   * @returns {boolean}
   */
  canInstall() {
    return this.#deferredPrompt !== null
  }

  /**
   * Get current install state
   * @param {string} tenantId
   * @returns {string}
   */
  getState(tenantId) {
    return this.#installations.get(tenantId)?.state || PWA_INSTALL_STATE.UNKNOWN
  }

  /**
   * Trigger install prompt
   * @param {string} tenantId
   * @returns {Promise<boolean>}
   */
  async promptInstall(tenantId) {
    if (!this.#deferredPrompt) return false

    this.#deferredPrompt.prompt()
    const { outcome } = await this.#deferredPrompt.userChoice

    if (outcome === 'accepted') {
      this.#setState(tenantId, PWA_INSTALL_STATE.INSTALLED)
      this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.INSTALLED, {
        tenantId,
        outcome,
        timestamp: Date.now(),
      })
    } else {
      this.#setState(tenantId, PWA_INSTALL_STATE.DISMISSED)
      this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.INSTALL_DISMISSED, {
        tenantId,
        outcome,
        timestamp: Date.now(),
      })
    }

    this.#deferredPrompt = null
    return outcome === 'accepted'
  }

  /**
   * Dismiss install prompt
   * @param {string} tenantId
   */
  dismiss(tenantId) {
    this.#setState(tenantId, PWA_INSTALL_STATE.DISMISSED)
    this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.INSTALL_DISMISSED, {
      tenantId,
      timestamp: Date.now(),
    })
  }

  /**
   * Check if app is already installed
   * @returns {boolean}
   */
  isInstalled() {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    if (window.navigator.standalone === true) return true
    return false
  }

  /**
   * Get installation info for tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getInstallationInfo(tenantId) {
    const data = this.#installations.get(tenantId) || {}
    return {
      tenantId,
      state: data.state || PWA_INSTALL_STATE.UNKNOWN,
      installedAt: data.installedAt,
      dismissedAt: data.dismissedAt,
      platform: this.#getPlatform(),
      canInstall: this.canInstall(),
      isInstalled: this.isInstalled(),
    }
  }

  /**
   * Clear installation state
   * @param {string} tenantId
   */
  clearState(tenantId) {
    this.#installations.delete(tenantId)
    try {
      localStorage.removeItem(`pwa-install-${tenantId}`)
    } catch {}
  }

  // ── Private ──

  #setupListeners() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.#deferredPrompt = e
      this.#checkInstallability()
    })

    window.addEventListener('appinstalled', () => {
      this.#deferredPrompt = null
    })
  }

  #checkInstallability() {
    if (this.isInstalled()) return
    if (this.#deferredPrompt) {
      this.#context?.eventBus?.emit(PWA_ENGINE_EVENTS.INSTALL_AVAILABLE, {
        timestamp: Date.now(),
      })
    }
  }

  #setState(tenantId, state) {
    const data = this.#installations.get(tenantId) || {}
    data.state = state

    if (state === PWA_INSTALL_STATE.INSTALLED) {
      data.installedAt = new Date().toISOString()
    } else if (state === PWA_INSTALL_STATE.DISMISSED) {
      data.dismissedAt = new Date().toISOString()
    }

    this.#installations.set(tenantId, data)
    this.#saveState(tenantId, data)
  }

  #loadState(tenantId) {
    try {
      const stored = localStorage.getItem(`pwa-install-${tenantId}`)
      if (stored) {
        const data = JSON.parse(stored)
        this.#installations.set(tenantId, data)
      }
    } catch {}
  }

  #saveState(tenantId, data) {
    try {
      localStorage.setItem(`pwa-install-${tenantId}`, JSON.stringify(data))
    } catch {}
  }

  #getPlatform() {
    const ua = navigator.userAgent
    if (/android/i.test(ua)) return 'android'
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
    return 'desktop'
  }
}
