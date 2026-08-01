import { validateNotification } from './notification.schema.js'
import { NotificationValidationError, NotificationStateError } from './notification.errors.js'
import {
  NOTIFICATION_STATUS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  isValidChannel,
  isValidType,
  isValidPriority,
  canTransitionTo,
  canCancel,
  canRetry,
  canArchive,
  canDelete,
} from './notification.channels.js'
import { isPending, isCompleted, isFailed, isTerminal } from './notification.status.js'

export function validateCreateData(data) {
  const result = validateNotification(data)
  if (!result.valid) {
    throw new NotificationValidationError('Notification validation failed', { errors: result.errors })
  }

  if (!data.recipientId) {
    throw new NotificationValidationError('Recipient ID is required')
  }

  if (!data.content && !data.templateId) {
    throw new NotificationValidationError('Either content or templateId is required')
  }

  if (data.content && typeof data.content !== 'string') {
    throw new NotificationValidationError('Content must be a string')
  }

  if (data.content && data.content.length > 10000) {
    throw new NotificationValidationError('Content exceeds maximum length of 10000 characters')
  }

  if (data.subject && data.subject.length > 500) {
    throw new NotificationValidationError('Subject exceeds maximum length of 500 characters')
  }

  return data
}

export function validateUpdateData(data, currentStatus) {
  const allowedFields = ['subject', 'content', 'metadata', 'priority', 'scheduledAt']
  const updates = {}

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field]
    }
  }

  if (data.subject && data.subject.length > 500) {
    throw new NotificationValidationError('Subject exceeds maximum length of 500 characters')
  }

  if (data.content && data.content.length > 10000) {
    throw new NotificationValidationError('Content exceeds maximum length of 10000 characters')
  }

  updates.updatedAt = new Date().toISOString()

  return updates
}

export function validateRecipient(recipientId) {
  if (!recipientId || typeof recipientId !== 'string') {
    throw new NotificationValidationError('Valid recipient ID is required')
  }
  return recipientId
}

export function validateChannel(channel) {
  if (!isValidChannel(channel)) {
    throw new NotificationValidationError(`Invalid notification channel: ${channel}`)
  }
  return channel
}

export function validateType(type) {
  if (!isValidType(type)) {
    throw new NotificationValidationError(`Invalid notification type: ${type}`)
  }
  return type
}

export function validatePriority(priority) {
  if (priority && !isValidPriority(priority)) {
    throw new NotificationValidationError(`Invalid notification priority: ${priority}`)
  }
  return priority || NOTIFICATION_PRIORITIES.NORMAL
}

export function validateStatusTransition(currentStatus, newStatus) {
  if (!canTransitionTo(currentStatus, newStatus)) {
    throw new NotificationStateError(
      `Invalid status transition: ${currentStatus} -> ${newStatus}`,
      currentStatus
    )
  }
  return true
}

export function validateScheduleDate(scheduledAt) {
  if (!scheduledAt) return null

  const date = new Date(scheduledAt)
  if (isNaN(date.getTime())) {
    throw new NotificationValidationError('Invalid scheduled date format')
  }

  const now = new Date()
  if (date <= now) {
    throw new NotificationValidationError('Scheduled date must be in the future')
  }

  return scheduledAt
}

export function validateCancel(notification) {
  if (!canCancel(notification.status)) {
    throw new NotificationStateError(
      `Cannot cancel notification in status: ${notification.status}`,
      notification.status
    )
  }
  return true
}

export function validateRetry(notification) {
  if (!canRetry(notification.status)) {
    throw new NotificationStateError(
      `Cannot retry notification in status: ${notification.status}`,
      notification.status
    )
  }
  if (notification.retryCount >= 3) {
    throw new NotificationStateError(
      `Maximum retry count (3) exceeded`,
      notification.status
    )
  }
  return true
}

export function validateArchive(notification) {
  if (!canArchive(notification.status)) {
    throw new NotificationStateError(
      `Cannot archive notification in status: ${notification.status}`,
      notification.status
    )
  }
  return true
}

export function validateDelete(notification) {
  if (!canDelete(notification.status)) {
    throw new NotificationStateError(
      `Cannot delete notification in status: ${notification.status}`,
      notification.status
    )
  }
  return true
}

export function validateLanguage(language) {
  if (!language || typeof language !== 'string') {
    return 'en'
  }
  if (language.length !== 2 && language.length !== 5) {
    throw new NotificationValidationError('Language must be a 2-letter ISO code (en) or 5-letter locale (en-US)')
  }
  return language.toLowerCase()
}
