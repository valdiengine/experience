/**
 * P15.11.4 — Notification Capability Core
 *
 * In-memory notification persistence for testing.
 */

import { NotificationPersistence } from './notification.persistence.js'
import { NotificationRequest } from '../notification.model.js'

export class InMemoryNotificationPersistence extends NotificationPersistence {
  #notifications
  #byInteraction
  #byCorrelationId

  constructor() {
    super()
    this.#notifications = new Map()
    this.#byInteraction = new Map()
    this.#byCorrelationId = new Map()
  }

  create(notificationData) {
    const notification = notificationData instanceof NotificationRequest
      ? notificationData
      : new NotificationRequest(notificationData)

    if (this.exists(notification.id)) {
      throw new Error(`Duplicate notification: ${notification.id}`)
    }

    this.#notifications.set(notification.id, notification.toJSON())

    if (notification.sourceInteractionId) {
      if (!this.#byInteraction.has(notification.sourceInteractionId)) {
        this.#byInteraction.set(notification.sourceInteractionId, new Set())
      }
      this.#byInteraction.get(notification.sourceInteractionId).add(notification.id)
    }

    if (notification.correlationId) {
      if (!this.#byCorrelationId.has(notification.correlationId)) {
        this.#byCorrelationId.set(notification.correlationId, new Set())
      }
      this.#byCorrelationId.get(notification.correlationId).add(notification.id)
    }

    return notification
  }

  get(notificationId) {
    return this.#notifications.get(notificationId) || null
  }

  update(notificationId, updates) {
    const existing = this.get(notificationId)
    if (!existing) {
      return null
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    this.#notifications.set(notificationId, updated)
    return { ...updated }
  }

  list(applicationId, filters = {}) {
    const all = Array.from(this.#notifications.values())
      .filter(n => n.applicationId === applicationId)

    return all.filter(notification => {
      if (filters.type && notification.type !== filters.type) return false
      if (filters.status && notification.status !== filters.status) return false
      if (filters.environment && notification.environment !== filters.environment) return false
      if (filters.channel) {
        if (!notification.channels.includes(filters.channel)) return false
      }
      if (filters.fromDate && notification.createdAt < filters.fromDate) return false
      if (filters.toDate && notification.createdAt > filters.toDate) return false
      return true
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  listByInteraction(sourceInteractionId, applicationId = null) {
    const ids = this.#byInteraction.get(sourceInteractionId)
    if (!ids) return []

    return Array.from(ids)
      .map(id => this.get(id))
      .filter(n => n !== null)
      .filter(n => applicationId === null || n.applicationId === applicationId)
  }

  listByCorrelationId(correlationId) {
    const ids = this.#byCorrelationId.get(correlationId)
    if (!ids) return []

    return Array.from(ids)
      .map(id => this.get(id))
      .filter(n => n !== null)
  }

  exists(notificationId) {
    return this.#notifications.has(notificationId)
  }

  markProcessing(notificationId) {
    const notification = this.get(notificationId)
    if (!notification) return null

    const updated = {
      ...notification,
      status: 'processing',
      attempts: (notification.attempts || 0) + 1,
      updatedAt: new Date().toISOString()
    }

    this.#notifications.set(notificationId, updated)
    return { ...updated }
  }

  markDelivered(notificationId, channel = null) {
    const notification = this.get(notificationId)
    if (!notification) return null

    const deliveries = { ...notification.deliveries }
    if (channel) {
      deliveries[channel] = {
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      }
    }

    const allDelivered = Object.values(deliveries).every(
      d => d.status === 'delivered'
    )

    const updated = {
      ...notification,
      status: allDelivered || !channel ? 'delivered' : notification.status,
      deliveries,
      deliveredAt: allDelivered || !channel ? new Date().toISOString() : notification.deliveredAt,
      updatedAt: new Date().toISOString()
    }

    this.#notifications.set(notificationId, updated)
    return { ...updated }
  }

  markFailed(notificationId, channel = null, error = null) {
    const notification = this.get(notificationId)
    if (!notification) return null

    const deliveries = { ...notification.deliveries }
    if (channel) {
      deliveries[channel] = {
        status: 'failed',
        error: error,
        failedAt: new Date().toISOString()
      }
    }

    const updated = {
      ...notification,
      status: notification.attempts >= notification.maxAttempts ? 'failed' : notification.status,
      deliveries,
      updatedAt: new Date().toISOString()
    }

    this.#notifications.set(notificationId, updated)
    return { ...updated }
  }

  markCancelled(notificationId) {
    const notification = this.get(notificationId)
    if (!notification) return null

    const updated = {
      ...notification,
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    }

    this.#notifications.set(notificationId, updated)
    return { ...updated }
  }

  getStatistics(applicationId) {
    const notifications = this.list(applicationId)

    const stats = {
      total: notifications.length,
      pending: 0,
      processing: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0,
      byChannel: {},
      byType: {}
    }

    for (const n of notifications) {
      stats[n.status] = (stats[n.status] || 0) + 1

      for (const channel of n.channels) {
        if (!stats.byChannel[channel]) {
          stats.byChannel[channel] = { total: 0, delivered: 0, failed: 0 }
        }
        stats.byChannel[channel].total++
        if (n.deliveries?.[channel]?.status === 'delivered') {
          stats.byChannel[channel].delivered++
        } else if (n.deliveries?.[channel]?.status === 'failed') {
          stats.byChannel[channel].failed++
        }
      }

      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1
    }

    return stats
  }

  clear() {
    this.#notifications.clear()
    this.#byInteraction.clear()
    this.#byCorrelationId.clear()
  }
}

export function createInMemoryNotificationPersistence() {
  return new InMemoryNotificationPersistence()
}

export default {
  InMemoryNotificationPersistence,
  createInMemoryNotificationPersistence
}
