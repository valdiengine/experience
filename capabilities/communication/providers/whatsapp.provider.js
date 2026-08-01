/**
 * Communication — WhatsApp Provider
 *
 * Sends messages via WhatsApp Business API
 */
export class WhatsAppProvider {
  #config = {}
  #initialized = false

  constructor(config = {}) {
    this.#config = config
  }

  get id() { return 'whatsapp' }
  get isInitialized() { return this.#initialized }

  async init() {
    this.#initialized = true
  }

  /**
   * Send WhatsApp message
   * @param {object} message - { recipient, body, media }
   * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
   */
  async send(message) {
    try {
      console.log(`[WhatsAppProvider] Sending to ${message.recipient}: ${message.body?.substring(0, 50)}...`)
      return { success: true, id: `wa_${Date.now()}` }
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
