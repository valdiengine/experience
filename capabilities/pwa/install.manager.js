/**
 * PWA Capability — Install Manager
 *
 * Handles PWA install prompt and installation state
 */
export class InstallManager {
  #deferredPrompt = null
  #isInstalled = false
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
    this.#init()
  }

  #init() {
    if (typeof window === 'undefined') return

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.#deferredPrompt = e
      this.#eventBus?.emit('pwa:install_prompt', { canInstall: true })
    })

    window.addEventListener('appinstalled', () => {
      this.#isInstalled = true
      this.#deferredPrompt = null
      this.#eventBus?.emit('pwa:installed', { timestamp: Date.now() })
    })
  }

  /**
   * Can the app be installed?
   * @returns {boolean}
   */
  get canInstall() {
    return this.#deferredPrompt !== null
  }

  /**
   * Is the app already installed?
   * @returns {boolean}
   */
  get isInstalled() {
    return this.#isInstalled
  }

  /**
   * Show install prompt
   * @returns {Promise<{ outcome: string }>}
   */
  async prompt() {
    if (!this.#deferredPrompt) {
      return { outcome: 'unavailable' }
    }

    this.#deferredPrompt.prompt()
    const result = await this.#deferredPrompt.userChoice
    this.#deferredPrompt = null
    return result
  }
}
