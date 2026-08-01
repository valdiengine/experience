export class NotificationError extends Error {
  constructor(message, code = 'NOTIFICATION_ERROR', statusCode = 500, details = {}) {
    super(message)
    this.name = 'NotificationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

export class NotificationValidationError extends NotificationError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'NotificationValidationError'
  }
}

export class NotificationNotFoundError extends NotificationError {
  constructor(notificationId) {
    super(`Notification not found: ${notificationId}`, 'NOT_FOUND', 404, { notificationId })
    this.name = 'NotificationNotFoundError'
  }
}

export class NotificationStateError extends NotificationError {
  constructor(message, currentStatus) {
    super(message, 'INVALID_STATE', 409, { currentStatus })
    this.name = 'NotificationStateError'
  }
}

export class NotificationPermissionError extends NotificationError {
  constructor(permission) {
    super(`Missing permission: ${permission}`, 'PERMISSION_DENIED', 403, { permission })
    this.name = 'NotificationPermissionError'
  }
}

export class NotificationDeliveryError extends NotificationError {
  constructor(message, channel, details = {}) {
    super(message, 'DELIVERY_FAILED', 500, { channel, ...details })
    this.name = 'NotificationDeliveryError'
  }
}

export class NotificationConflictError extends NotificationError {
  constructor(message, details = {}) {
    super(message, 'CONFLICT', 409, details)
    this.name = 'NotificationConflictError'
  }
}

export class NotificationTemplateError extends NotificationError {
  constructor(message, templateId, details = {}) {
    super(message, 'TEMPLATE_ERROR', 400, { templateId, ...details })
    this.name = 'NotificationTemplateError'
  }
}
