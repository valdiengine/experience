/**
 * Communication Capability — Multi-channel message management
 *
 * Business-agnostic: WhatsApp, Chat, Email, Push
 * Provider-based architecture: each channel is a separate provider
 * Simplified flows: no admin interface required
 */
import { BaseCapability } from '../core/base.capability.js'
import { COMMUNICATION_EVENTS } from './communication.events.js'
import { COMMUNICATION_CHANNELS, MESSAGE_STATUS, validateMessage } from './communication.schema.js'
import { WhatsAppProvider } from './providers/whatsapp.provider.js'
import { ChatProvider } from './providers/chat.provider.js'
import { EmailProvider } from './providers/email.provider.js'
import { PushProvider } from './providers/push.provider.js'

export class CommunicationCapability extends BaseCapability {
  static id = 'communication'
  static name = 'Communication'
  static version = '1.0.0'
  static dependencies = []

  #providers = new Map()
  #messages = []
  #conversations = new Map()

  async init(context, config = {}) {
    await super.init(context, config)

    if (config.whatsapp !== false) {
      this.#providers.set(COMMUNICATION_CHANNELS.WHATSAPP, new WhatsAppProvider(config.whatsapp || {}))
    }
    if (config.chat !== false) {
      this.#providers.set(COMMUNICATION_CHANNELS.CHAT, new ChatProvider(config.chat || {}))
    }
    if (config.email !== false) {
      this.#providers.set(COMMUNICATION_CHANNELS.EMAIL, new EmailProvider(config.email || {}))
    }
    if (config.push !== false) {
      this.#providers.set(COMMUNICATION_CHANNELS.PUSH, new PushProvider(config.push || {}))
    }
  }

  async activate() {
    for (const [channel, provider] of this.#providers) {
      await provider.init()
      this.emit(COMMUNICATION_EVENTS.CHANNEL_REGISTERED, { channel })
    }
    await super.activate()
  }

  async deactivate() {
    this.#messages = []
    this.#conversations.clear()
    await super.deactivate()
  }

  async destroy() {
    this.#messages = []
    this.#conversations.clear()
    this.#providers.clear()
    await super.destroy()
  }

  /**
   * Send message via specified channel
   * @param {object} message - { channel, recipient, body, subject?, sender? }
   * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
   */
  async send(message) {
    const validation = validateMessage({
      ...message,
      id: message.id || `msg_${Date.now()}`,
      tenantId: this.context?.tenant?.id,
      status: MESSAGE_STATUS.QUEUED,
      createdAt: new Date().toISOString(),
    })

    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    const provider = this.#providers.get(message.channel)
    if (!provider) {
      return { success: false, error: `No provider for channel: ${message.channel}` }
    }

    const entry = {
      ...message,
      id: message.id || `msg_${Date.now()}`,
      tenantId: this.context?.tenant?.id,
      status: MESSAGE_STATUS.QUEUED,
      createdAt: new Date().toISOString(),
    }

    this.#messages.push(entry)

    const result = await provider.send(entry)

    if (result.success) {
      entry.status = MESSAGE_STATUS.SENT
      entry.sentAt = new Date().toISOString()
      this.emit(COMMUNICATION_EVENTS.MESSAGE_SENT, { message: entry })
    } else {
      entry.status = MESSAGE_STATUS.FAILED
      this.emit(COMMUNICATION_EVENTS.MESSAGE_FAILED, { message: entry, error: result.error })
    }

    return result
  }

  /**
   * Send message to multiple recipients
   * @param {object} message - Base message (without recipient)
   * @param {string[]} recipients - Array of recipient IDs
   * @returns {Promise<object[]>}
   */
  async sendBulk(message, recipients) {
    const results = []
    for (const recipient of recipients) {
      const result = await this.send({ ...message, recipient })
      results.push({ recipient, ...result })
    }
    return results
  }

  /**
   * Get provider for channel
   * @param {string} channel - Channel name
   * @returns {object|null}
   */
  getProvider(channel) {
    return this.#providers.get(channel) || null
  }

  /**
   * Get all registered channels
   * @returns {string[]}
   */
  getChannels() {
    return Array.from(this.#providers.keys())
  }

  /**
   * Get sent messages
   * @returns {object[]}
   */
  getMessages() {
    return [...this.#messages]
  }

  /**
   * Get conversation with recipient
   * @param {string} recipient - Recipient ID
   * @returns {object|null}
   */
  getConversation(recipient) {
    return this.#conversations.get(recipient) || null
  }
}

export default CommunicationCapability
