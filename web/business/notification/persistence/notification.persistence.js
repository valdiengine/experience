/**
 * P15.11.4 — Notification Capability Core
 *
 * Notification persistence contract.
 */

export class NotificationPersistence {
  create(notification) {
    throw new Error('Not implemented')
  }

  get(notificationId) {
    throw new Error('Not implemented')
  }

  update(notificationId, updates) {
    throw new Error('Not implemented')
  }

  list(applicationId, filters = {}) {
    throw new Error('Not implemented')
  }

  listByInteraction(sourceInteractionId, applicationId = null) {
    throw new Error('Not implemented')
  }

  listByCorrelationId(correlationId) {
    throw new Error('Not implemented')
  }

  exists(notificationId) {
    throw new Error('Not implemented')
  }

  markProcessing(notificationId) {
    throw new Error('Not implemented')
  }

  markDelivered(notificationId, channel = null) {
    throw new Error('Not implemented')
  }

  markFailed(notificationId, channel = null, error = null) {
    throw new Error('Not implemented')
  }

  markCancelled(notificationId) {
    throw new Error('Not implemented')
  }

  getStatistics(applicationId) {
    throw new Error('Not implemented')
  }
}

export default {
  NotificationPersistence
}
