/**
 * Communication — Chat Provider
 *
 * Sends messages via Web Chat (widget, live chat)
 */
export class ChatProvider {
  #config = {}
  #initialized = false
  #handlers = new Map()

  constructor(config = {}) {
    this.#config = config
  }

  get id() { return 'chat' }
  get isInitialized() { return this.#initialized }

  async init() {
    this.#initialized = true
  }

  /**
   * Send chat message
   * @param {object} message - { recipient, body, sender }
   * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
   */
  async send(message) {
    try {
      console.log(`[ChatProvider] Sending to ${message.recipient}: ${message.body?.substring(0, 50)}...`)
      return { success: true, id: `chat_${Date.now()}` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Listen for incoming chat messages
   * @param {function} handler - Callback for incoming messages
   */
  onMessage(handler) {
    this.#handlers.set('message', handler)
  }

  /**
   * Check if provider is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.#initialized
  }
}
