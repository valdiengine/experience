/**
 * Notifications Capability — Email Provider
 *
 * Business-agnostic: sends emails via configured service
 */
export class EmailProvider {
  #config = {}

  constructor(config = {}) {
    this.#config = config
  }

  /**
   * Send email notification
   * @param {object} notification - Notification data
   * @returns {Promise<void>}
   */
  async send(notification) {
    // Placeholder: integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[EmailProvider] Sending to ${notification.recipient}: ${notification.subject}`)
  }
}
