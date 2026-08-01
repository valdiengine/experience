/**
 * Communication — Push Provider
 *
 * Sends push notifications via Firebase, OneSignal, etc.
 */
export class PushProvider {
  #config = {}
  #initialized = false

  constructor(config = {}) {
    this.#config = config
  }

  get id() { return 'push' }
  get isInitialized() { return this.#initialized }

  async init() {
    this.#initialized = true
  }

  /**
   * Send push notification
   * @param {object} message - { recipient, title, body, data }
   * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
   */
  async send(message) {
    try {
      console.log(`[PushProvider] Sending to ${message.recipient}: ${message.title}`)
      return { success: true, id: `push_${Date.now()}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Check if provider is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.#initialized && !!this.#config.apiKey
  }
}
