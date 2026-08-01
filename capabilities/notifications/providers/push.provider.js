/**
 * Notifications Capability — Push Provider
 *
 * Business-agnostic: sends push notifications via configured service
 */
export class PushProvider {
  #config = {}

  constructor(config = {}) {
    this.#config = config
  }

  /**
   * Send push notification
   * @param {object} notification - Notification data
   * @returns {Promise<void>}
   */
  async send(notification) {
    // Placeholder: integrate with push service (Firebase, OneSignal, etc.)
    console.log(`[PushProvider] Sending push: ${notification.body}`)
  }
}
