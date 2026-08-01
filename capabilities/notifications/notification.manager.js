/**
 * Notifications Capability — Manager
 *
 * Orchestrates all notification sub-modules: templates, preferences, scheduling, batching, rate limiting, analytics
 * Business-agnostic: no knowledge of what notifications are for
 */
import { NOTIFICATION_STATUS, NOTIFICATION_PRIORITY } from './notification.schema.js'
import { NOTIFICATION_EVENTS } from './notification.events.js'
import { TemplateManager } from './templates/template.manager.js'
import { NotificationPreferences } from './preferences/notification.preferences.js'
import { NotificationScheduler } from './scheduler/notification.scheduler.js'
import { BatchProcessor } from './batching/batch.processor.js'
import { RateLimiter } from './rate-limit/rate.limiter.js'
import { NotificationAnalytics } from './analytics/notification.analytics.js'

export class NotificationManager {
  #queue = []
  #sent = []
  #failed = []
  #providers = new Map()
  #eventBus = null
  #templates = null
  #preferences = null
  #scheduler = null
  #batchProcessor = null
  #rateLimiter = null
  #analytics = null

  constructor(eventBus) {
    this.#eventBus = eventBus
    this.#templates = new TemplateManager(eventBus)
    this.#preferences = new NotificationPreferences(eventBus)
    this.#rateLimiter = new RateLimiter(eventBus)
    this.#analytics = new NotificationAnalytics(eventBus)
    this.#batchProcessor = new BatchProcessor(eventBus, (n) => this.send(n))
    this.#scheduler = new NotificationScheduler(eventBus, (n) => this.send(n))
  }

  registerProvider(channel, provider) {
    this.#providers.set(channel, provider)
  }

  /**
   * Send notification via appropriate provider with preferences + rate limiting
   * @param {object} notification - Notification data
   * @returns {{ success: boolean, id?: string, error?: string }}
   */
  async send(notification) {
    // Check preferences
    const prefCheck = this.#preferences.isAllowed(
      notification.tenantId,
      notification.channel,
      notification.category || 'general',
      notification.recipientId
    )
    if (!prefCheck.allowed) {
      return { success: false, error: `Blocked by preferences: ${prefCheck.reason}` }
    }

    // Check rate limits
    const rateCheck = this.#rateLimiter.check(
      notification.channel,
      notification.recipient,
      notification.tenantId
    )
    if (!rateCheck.allowed) {
      this.#eventBus?.emit(NOTIFICATION_EVENTS.RATE_LIMITED, {
        notification,
        reason: rateCheck.reason,
        retryAfterMs: rateCheck.retryAfterMs,
      })
      return { success: false, error: `Rate limited: ${rateCheck.reason}`, retryAfterMs: rateCheck.retryAfterMs }
    }

    const provider = this.#providers.get(notification.channel)
    if (!provider) {
      this.#eventBus?.emit(NOTIFICATION_EVENTS.FAILED, {
        notification,
        error: `No provider for channel: ${notification.channel}`,
      })
      return { success: false, error: `No provider for channel: ${notification.channel}` }
    }

    const entry = {
      ...notification,
      id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: NOTIFICATION_STATUS.QUEUED,
      priority: notification.priority || NOTIFICATION_PRIORITY.NORMAL,
      retryCount: notification.retryCount || 0,
      maxRetries: notification.maxRetries || 3,
      createdAt: notification.createdAt || new Date().toISOString(),
    }

    this.#queue.push(entry)

    try {
      entry.status = NOTIFICATION_STATUS.SENDING
      await provider.send(entry)
      entry.status = NOTIFICATION_STATUS.SENT
      entry.sentAt = new Date().toISOString()
      this.#sent.push(entry)
      this.#removeFromQueue(entry.id)
      this.#eventBus?.emit(NOTIFICATION_EVENTS.SENT, { notification: entry })
      return { success: true, id: entry.id }
    } catch (error) {
      entry.status = NOTIFICATION_STATUS.FAILED
      entry.failedAt = new Date().toISOString()
      entry.error = error.message
      this.#failed.push(entry)
      this.#removeFromQueue(entry.id)

      // Auto-retry
      if (entry.retryCount < entry.maxRetries) {
        entry.retryCount++
        entry.status = NOTIFICATION_STATUS.QUEUED
        const delay = Math.pow(2, entry.retryCount) * 1000
        this.#eventBus?.emit(NOTIFICATION_EVENTS.RETRY_SCHEDULED, {
          notification: entry,
          retryAfterMs: delay,
          attempt: entry.retryCount,
        })
        setTimeout(() => {
          this.#failed = this.#failed.filter(n => n.id !== entry.id)
          this.send(entry)
        }, delay)
        return { success: false, error: error.message, retrying: true, attempt: entry.retryCount }
      }

      this.#eventBus?.emit(NOTIFICATION_EVENTS.RETRY_EXHAUSTED, { notification: entry })
      this.#eventBus?.emit(NOTIFICATION_EVENTS.FAILED, { notification: entry, error: error.message })
      return { success: false, error: error.message }
    }
  }

  /**
   * Send notification from template
   * @param {object} config - { tenantId, templateId, recipient, recipientId, channel, variables, priority, category }
   * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
   */
  async sendFromTemplate(config) {
    const { tenantId, templateId, recipient, recipientId, channel, variables, priority, category } = config

    const rendered = this.#templates.render(templateId, variables)
    if (!rendered.success) {
      return { success: false, error: rendered.error }
    }

    return this.send({
      tenantId,
      channel: channel || rendered.rendered.channel,
      recipient,
      recipientId,
      subject: rendered.rendered.subject,
      body: rendered.rendered.body,
      htmlBody: rendered.rendered.htmlBody,
      templateId,
      variables,
      priority,
      category: category || rendered.rendered.category,
      source: 'template',
    })
  }

  /**
   * Schedule a notification
   * @param {object} config - { tenantId, notification, scheduledAt }
   * @returns {{ success: boolean, scheduleId?: string, error?: string }}
   */
  schedule(config) {
    return this.#scheduler.schedule(config)
  }

  /**
   * Schedule a recurring notification
   * @param {object} config
   * @returns {{ success: boolean, scheduleId?: string, error?: string }}
   */
  scheduleRecurring(config) {
    return this.#scheduler.scheduleRecurring(config)
  }

  /**
   * Cancel a scheduled notification
   * @param {string} scheduleId
   * @returns {{ success: boolean, error?: string }}
   */
  cancelSchedule(scheduleId) {
    return this.#scheduler.cancel(scheduleId)
  }

  /**
   * Create and process a batch
   * @param {object} config - { tenantId, channel, notifications, batchSize }
   * @returns {{ success: boolean, batchId?: string }}
   */
  createBatch(config) {
    return this.#batchProcessor.createBatch(config)
  }

  /**
   * Process a batch
   * @param {string} batchId
   * @returns {Promise<{ success: boolean, result?: object }>}
   */
  async processBatch(batchId) {
    return this.#batchProcessor.processBatch(batchId)
  }

  // Sub-module accessors
  get templates() { return this.#templates }
  get preferences() { return this.#preferences }
  get scheduler() { return this.#scheduler }
  get batchProcessor() { return this.#batchProcessor }
  get rateLimiter() { return this.#rateLimiter }
  get analytics() { return this.#analytics }

  getQueued() { return [...this.#queue] }
  getSent() { return [...this.#sent] }
  getFailed() { return [...this.#failed] }

  #removeFromQueue(id) {
    this.#queue = this.#queue.filter(n => n.id !== id)
  }

  clear() {
    this.#queue = []
    this.#sent = []
    this.#failed = []
    this.#providers.clear()
    this.#templates.clear()
    this.#preferences.clear()
    this.#scheduler.clear()
    this.#batchProcessor.clear()
    this.#rateLimiter.clear()
    this.#analytics.clear()
  }
}
