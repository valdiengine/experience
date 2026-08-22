/**
 * P15.11.4 — Notification Capability Core
 *
 * Notification error types.
 */

export class NotificationError extends Error {
  constructor(message, code = 'NOTIFICATION_ERROR') {
    super(message)
    this.name = 'NotificationError'
    this.code = code
  }
}

export class NotificationValidationError extends NotificationError {
  constructor(message, errors = []) {
    super(message, 'NOTIFICATION_VALIDATION_ERROR')
    this.name = 'NotificationValidationError'
    this.errors = errors
  }
}

export class NotificationNotFoundError extends NotificationError {
  constructor(notificationId) {
    super(`Notification not found: ${notificationId}`, 'NOTIFICATION_NOT_FOUND')
    this.name = 'NotificationNotFoundError'
    this.notificationId = notificationId
  }
}

export class NotificationPersistenceError extends NotificationError {
  constructor(message, cause = null) {
    super(message, 'NOTIFICATION_PERSISTENCE_ERROR')
    this.name = 'NotificationPersistenceError'
    this.cause = cause
  }
}

export class NotificationDeliveryError extends NotificationError {
  constructor(notificationId, channel, message) {
    super(`Delivery failed for notification ${notificationId} via ${channel}: ${message}`, 'NOTIFICATION_DELIVERY_ERROR')
    this.name = 'NotificationDeliveryError'
    this.notificationId = notificationId
    this.channel = channel
  }
}

export class NotificationAdapterError extends NotificationError {
  constructor(adapter, message, cause = null) {
    super(`Adapter ${adapter} error: ${message}`, 'NOTIFICATION_ADAPTER_ERROR')
    this.name = 'NotificationAdapterError'
    this.adapter = adapter
    this.cause = cause
  }
}

export class NotificationChannelUnsupportedError extends NotificationError {
  constructor(channel) {
    super(`Channel not supported: ${channel}`, 'NOTIFICATION_CHANNEL_UNSUPPORTED')
    this.name = 'NotificationChannelUnsupportedError'
    this.channel = channel
  }
}

export class NotificationTemplateError extends NotificationError {
  constructor(message, template = null) {
    super(message, 'NOTIFICATION_TEMPLATE_ERROR')
    this.name = 'NotificationTemplateError'
    this.template = template
  }
}

export class NotificationRetryExhaustedError extends NotificationError {
  constructor(notificationId, attempts) {
    super(`Notification ${notificationId} failed after ${attempts} attempts`, 'NOTIFICATION_RETRY_EXHAUSTED')
    this.name = 'NotificationRetryExhaustedError'
    this.notificationId = notificationId
    this.attempts = attempts
  }
}

export class NotificationIdempotencyError extends NotificationError {
  constructor(notificationId, eventId) {
    super(`Duplicate notification for event ${eventId}: ${notificationId}`, 'NOTIFICATION_IDEMPOTENCY_ERROR')
    this.name = 'NotificationIdempotencyError'
    this.notificationId = notificationId
    this.eventId = eventId
  }
}

export class NotificationIsolationViolationError extends NotificationError {
  constructor(message, applicationId = null) {
    super(message, 'NOTIFICATION_ISOLATION_VIOLATION')
    this.name = 'NotificationIsolationViolationError'
    this.applicationId = applicationId
  }
}

export class NotificationPreviewError extends NotificationError {
  constructor(message) {
    super(`Preview violation: ${message}`, 'NOTIFICATION_PREVIEW_ERROR')
    this.name = 'NotificationPreviewError'
  }
}

export class NotificationRateLimitError extends NotificationError {
  constructor(applicationId, limit) {
    super(`Rate limit exceeded for ${applicationId}: ${limit}`, 'NOTIFICATION_RATE_LIMIT')
    this.name = 'NotificationRateLimitError'
    this.applicationId = applicationId
    this.limit = limit
  }
}

export default {
  NotificationError,
  NotificationValidationError,
  NotificationNotFoundError,
  NotificationPersistenceError,
  NotificationDeliveryError,
  NotificationAdapterError,
  NotificationChannelUnsupportedError,
  NotificationTemplateError,
  NotificationRetryExhaustedError,
  NotificationIdempotencyError,
  NotificationIsolationViolationError,
  NotificationPreviewError,
  NotificationRateLimitError
}
