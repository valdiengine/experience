/**
 * Notifications Capability — Analytics
 *
 * Tracks notification delivery, engagement, and performance metrics
 * Business-agnostic: analytics are operational metrics, not business metrics
 */
import { NOTIFICATION_EVENTS } from '../notification.events.js'
import { NOTIFICATION_STATUS } from '../notification.schema.js'

export class NotificationAnalytics {
  #stats = new Map()
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
    this.#setupListeners()
  }

  #setupListeners() {
    this.#eventBus?.on(NOTIFICATION_EVENTS.SENT, (data) => {
      this.#recordEvent(data.notification, 'sent')
    })

    this.#eventBus?.on(NOTIFICATION_EVENTS.FAILED, (data) => {
      this.#recordEvent(data.notification, 'failed')
    })

    this.#eventBus?.on(NOTIFICATION_EVENTS.DELIVERED, (data) => {
      this.#recordEvent(data.notification, 'delivered')
    })

    this.#eventBus?.on(NOTIFICATION_EVENTS.OPENED, (data) => {
      this.#recordEvent(data.notification, 'opened')
    })

    this.#eventBus?.on(NOTIFICATION_EVENTS.CLICKED, (data) => {
      this.#recordEvent(data.notification, 'clicked')
    })

    this.#eventBus?.on(NOTIFICATION_EVENTS.BATCH_COMPLETED, (data) => {
      this.#recordBatch(data)
    })
  }

  #getKey(tenantId, channel) {
    return `${tenantId}:${channel || 'all'}`
  }

  #recordEvent(notification, eventType) {
    if (!notification?.tenantId) return

    const channel = notification.channel || 'unknown'
    const key = this.#getKey(notification.tenantId, channel)
    const globalKey = this.#getKey(notification.tenantId)

    this.#ensureKey(key)
    this.#ensureKey(globalKey)

    const stats = this.#stats.get(key)
    stats[eventType] = (stats[eventType] || 0) + 1
    stats.lastUpdated = new Date().toISOString()

    const globalStats = this.#stats.get(globalKey)
    globalStats[eventType] = (globalStats[eventType] || 0) + 1
    globalStats.lastUpdated = new Date().toISOString()
  }

  #recordBatch(data) {
    if (!data.tenantId) return

    const key = this.#getKey(data.tenantId)
    this.#ensureKey(key)
    const stats = this.#stats.get(key)
    stats.batches = (stats.batches || 0) + 1
    stats.batchSent = (stats.batchSent || 0) + (data.sent || 0)
    stats.batchFailed = (stats.batchFailed || 0) + (data.failed || 0)
  }

  #ensureKey(key) {
    if (!this.#stats.has(key)) {
      this.#stats.set(key, {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        batches: 0,
        batchSent: 0,
        batchFailed: 0,
        lastUpdated: null,
      })
    }
  }

  /**
   * Get stats for a tenant, optionally filtered by channel
   * @param {string} tenantId
   * @param {string} [channel]
   * @returns {object}
   */
  getStats(tenantId, channel) {
    const key = this.#getKey(tenantId, channel)
    const stats = this.#stats.get(key)
    if (!stats) return { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 }

    const deliveryRate = stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(1) : 0
    const openRate = stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(1) : 0
    const clickRate = stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(1) : 0
    const failureRate = stats.sent > 0 ? ((stats.failed / stats.sent) * 100).toFixed(1) : 0

    return {
      ...stats,
      deliveryRate: parseFloat(deliveryRate),
      openRate: parseFloat(openRate),
      clickRate: parseFloat(clickRate),
      failureRate: parseFloat(failureRate),
    }
  }

  /**
   * Get per-channel breakdown for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getChannelBreakdown(tenantId) {
    const channels = {}
    const knownChannels = ['email', 'push', 'sms', 'whatsapp', 'in_app']

    for (const channel of knownChannels) {
      channels[channel] = this.getStats(tenantId, channel)
    }

    return channels
  }

  /**
   * Get summary report for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getReport(tenantId) {
    const total = this.getStats(tenantId)
    const channels = this.getChannelBreakdown(tenantId)

    return {
      tenantId,
      total,
      channels,
      generatedAt: new Date().toISOString(),
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.#stats.clear()
  }
}
