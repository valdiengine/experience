/**
 * Notifications Capability — v2.0.0
 *
 * Full notification engine: templates, preferences, scheduling, batching, rate limiting, analytics
 * Business-agnostic: email, push, whatsapp, sms, in-app
 * Delegates to DataManager — no direct data access
 * Activatable/deactivatable per tenant
 */
import { BaseCapability } from '../core/base.capability.js'
import { NOTIFICATION_EVENTS } from './notification.events.js'
import { NOTIFICATION_CHANNELS } from './notification.schema.js'
import { NotificationManager } from './notification.manager.js'
import { EmailProvider } from './providers/email.provider.js'
import { PushProvider } from './providers/push.provider.js'
import { WhatsAppProvider } from './providers/whatsapp.provider.js'

export class NotificationsCapability extends BaseCapability {
  static id = 'notifications'
  static name = 'Notifications'
  static version = '2.0.0'
  static dependencies = []

  #manager = null

  async init(context, config = {}) {
    await super.init(context, config)

    this.#manager = new NotificationManager(this.eventBus)

    // Register providers based on config
    if (config.email) {
      this.#manager.registerProvider(NOTIFICATION_CHANNELS.EMAIL, new EmailProvider(config.email))
    }
    if (config.push) {
      this.#manager.registerProvider(NOTIFICATION_CHANNELS.PUSH, new PushProvider(config.push))
    }
    if (config.whatsapp) {
      this.#manager.registerProvider(NOTIFICATION_CHANNELS.WHATSAPP, new WhatsAppProvider(config.whatsapp))
    }

    // Initialize default preferences for tenant
    if (context?.tenant?.id) {
      this.#manager.preferences.initDefaults(context.tenant.id)
    }
  }

  async activate() {
    await super.activate()
  }

  async deactivate() {
    this.#manager?.clear()
    await super.deactivate()
  }

  async destroy() {
    this.#manager?.clear()
    await super.destroy()
  }

  /**
   * Get notification manager
   * @returns {NotificationManager}
   */
  get manager() {
    return this.#manager
  }

  /**
   * Send notification
   * @param {object} notification - Notification data
   * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
   */
  async send(notification) {
    return this.#manager?.send(notification) || { success: false, error: 'Manager not initialized' }
  }

  /**
   * Send from template
   * @param {object} config - { tenantId, templateId, recipient, variables }
   * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
   */
  async sendFromTemplate(config) {
    return this.#manager?.sendFromTemplate(config) || { success: false, error: 'Manager not initialized' }
  }

  /**
   * Schedule a notification
   * @param {object} config
   * @returns {{ success: boolean, scheduleId?: string, error?: string }}
   */
  schedule(config) {
    return this.#manager?.schedule(config) || { success: false, error: 'Manager not initialized' }
  }

  /**
   * Schedule recurring
   * @param {object} config
   * @returns {{ success: boolean, scheduleId?: string, error?: string }}
   */
  scheduleRecurring(config) {
    return this.#manager?.scheduleRecurring(config) || { success: false, error: 'Manager not initialized' }
  }

  /**
   * Create batch
   * @param {object} config
   * @returns {{ success: boolean, batchId?: string }}
   */
  createBatch(config) {
    return this.#manager?.createBatch(config) || { success: false, error: 'Manager not initialized' }
  }

  /**
   * Process batch
   * @param {string} batchId
   * @returns {Promise<{ success: boolean, result?: object }>}
   */
  async processBatch(batchId) {
    return this.#manager?.processBatch(batchId) || { success: false, error: 'Manager not initialized' }
  }

  /**
   * Get templates sub-module
   */
  get templates() { return this.#manager?.templates }

  /**
   * Get preferences sub-module
   */
  get preferences() { return this.#manager?.preferences }

  /**
   * Get scheduler sub-module
   */
  get scheduler() { return this.#manager?.scheduler }

  /**
   * Get analytics sub-module
   */
  get analytics() { return this.#manager?.analytics }

  /**
   * Get rate limiter sub-module
   */
  get rateLimiter() { return this.#manager?.rateLimiter }
}

export default NotificationsCapability
