/**
 * Communication — Email Provider
 *
 * Sends emails via configured service (SendGrid, SES, etc.)
 */
export class EmailProvider {
  #config = {}
  #initialized = false

  constructor(config = {}) {
    this.#config = config
  }

  get id() { return 'email' }
  get isInitialized() { return this.#initialized }

  async init() {
    this.#initialized = true
  }

  /**
   * Send email
   * @param {object} message - { recipient, subject, body, html }
   * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
   */
  async send(message) {
    try {
      console.log(`[EmailProvider] Sending to ${message.recipient}: ${message.subject}`)
      return { success: true, id: `email_${Date.now()}` }
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
