/**
 * P15.11.4 — Notification Capability Core
 *
 * Notification event generation.
 */

import { NOTIFICATION_EVENT_TYPES } from './notification.model.js'

export class NotificationEventGenerator {
  generateCreatedEvent(notification) {
    return {
      id: `evt_notif_created_${notification.id}`,
      type: NOTIFICATION_EVENT_TYPES.CREATED,
      source: 'notification-capability',
      applicationId: notification.applicationId,
      domain: notification.domain,
      route: notification.route,
      company: notification.company,
      destination: notification.destination,
      timestamp: new Date().toISOString(),
      correlationId: notification.correlationId,
      payload: {
        notificationId: notification.id,
        notificationType: notification.type,
        status: notification.status,
        channels: notification.channels,
        environment: notification.environment
      }
    }
  }

  generateProcessingEvent(notification) {
    return {
      id: `evt_notif_processing_${notification.id}`,
      type: NOTIFICATION_EVENT_TYPES.PROCESSING,
      source: 'notification-capability',
      applicationId: notification.applicationId,
      domain: notification.domain,
      route: notification.route,
      company: notification.company,
      destination: notification.destination,
      timestamp: new Date().toISOString(),
      correlationId: notification.correlationId,
      payload: {
        notificationId: notification.id,
        status: notification.status,
        attempt: notification.attempts
      }
    }
  }

  generateDeliveredEvent(notification, channel = null) {
    return {
      id: `evt_notif_delivered_${notification.id}`,
      type: NOTIFICATION_EVENT_TYPES.DELIVERED,
      source: 'notification-capability',
      applicationId: notification.applicationId,
      domain: notification.domain,
      route: notification.route,
      company: notification.company,
      destination: notification.destination,
      timestamp: new Date().toISOString(),
      correlationId: notification.correlationId,
      payload: {
        notificationId: notification.id,
        status: notification.status,
        channel,
        deliveredAt: notification.deliveredAt
      }
    }
  }

  generateFailedEvent(notification, channel = null, error = null) {
    return {
      id: `evt_notif_failed_${notification.id}`,
      type: NOTIFICATION_EVENT_TYPES.FAILED,
      source: 'notification-capability',
      applicationId: notification.applicationId,
      domain: notification.domain,
      route: notification.route,
      company: notification.company,
      destination: notification.destination,
      timestamp: new Date().toISOString(),
      correlationId: notification.correlationId,
      payload: {
        notificationId: notification.id,
        status: notification.status,
        channel,
        error,
        attempt: notification.attempts,
        canRetry: notification.canRetry
      }
    }
  }

  generateRetriedEvent(notification) {
    return {
      id: `evt_notif_retried_${notification.id}`,
      type: NOTIFICATION_EVENT_TYPES.RETRIED,
      source: 'notification-capability',
      applicationId: notification.applicationId,
      domain: notification.domain,
      route: notification.route,
      company: notification.company,
      destination: notification.destination,
      timestamp: new Date().toISOString(),
      correlationId: notification.correlationId,
      payload: {
        notificationId: notification.id,
        attempt: notification.attempts,
        status: notification.status
      }
    }
  }

  generateCancelledEvent(notification) {
    return {
      id: `evt_notif_cancelled_${notification.id}`,
      type: NOTIFICATION_EVENT_TYPES.CANCELLED,
      source: 'notification-capability',
      applicationId: notification.applicationId,
      domain: notification.domain,
      route: notification.route,
      company: notification.company,
      destination: notification.destination,
      timestamp: new Date().toISOString(),
      correlationId: notification.correlationId,
      payload: {
        notificationId: notification.id,
        status: notification.status
      }
    }
  }

  generateHistoryEntry(action, notification, metadata = {}) {
    return {
      id: `hist_notif_${notification.id}_${Date.now().toString(36)}`,
      action,
      notificationId: notification.id,
      type: notification.type,
      status: notification.status,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  }
}

export function createNotificationEventGenerator() {
  return new NotificationEventGenerator()
}

export default {
  NotificationEventGenerator,
  createNotificationEventGenerator
}
