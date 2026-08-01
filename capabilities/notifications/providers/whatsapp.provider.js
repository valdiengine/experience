/**
 * Notifications Capability — WhatsApp Provider
 *
 * Business-agnostic: sends WhatsApp messages via configured service
 */
export class WhatsAppProvider {
  #config = {}

  constructor(config = {}) {
    this.#config = config
  }

  /**
   * Send WhatsApp notification
   * @param {object} notification - Notification data
   * @returns {Promise<void>}
   */
  async send(notification) {
    // Placeholder: integrate with WhatsApp Business API
    console.log(`[WhatsAppProvider] Sending to ${notification.recipient}: ${notification.body}`)
  }
}
