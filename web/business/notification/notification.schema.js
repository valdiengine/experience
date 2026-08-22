/**
 * P15.11.4 — Notification Capability Core
 *
 * Notification schema and validation.
 */

import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUS,
  NOTIFICATION_ENVIRONMENTS,
  RECIPIENT_TYPES,
  ALL_CHANNELS
} from './notification.model.js'

export const NOTIFICATION_CONFIG_SCHEMA = Object.freeze({
  enabled: { type: 'boolean', default: false },
  events: {
    type: 'object',
    default: {},
    additionalProperties: {
      type: 'object',
      properties: {
        channels: {
          type: 'array',
          items: { type: 'string', enum: Object.values(NOTIFICATION_CHANNELS) },
          default: []
        },
        enabled: { type: 'boolean', default: true },
        recipients: {
          type: 'array',
          items: { type: 'string', enum: Object.values(RECIPIENT_TYPES) },
          default: []
        },
        template: { type: 'string', default: null }
      }
    }
  },
  channels: {
    type: 'object',
    default: {},
    additionalProperties: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: false },
        configuration: { type: 'object', default: {} }
      }
    }
  },
  retry: {
    type: 'object',
    properties: {
      maxAttempts: { type: 'number', minimum: 1, maximum: 10, default: 3 },
      delayMs: { type: 'number', minimum: 1000, maximum: 86400000, default: 5000 }
    },
    default: { maxAttempts: 3, delayMs: 5000 }
  },
  rateLimit: {
    type: 'object',
    properties: {
      perApplication: { type: 'number', minimum: 1, default: 100 },
      perHour: { type: 'number', minimum: 1, default: 1000 }
    },
    default: { perApplication: 100, perHour: 1000 }
  }
})

export function validateNotificationConfiguration(config) {
  const errors = []

  if (config === null || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration must be an object'] }
  }

  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean')
  }

  if (config.events) {
    if (typeof config.events !== 'object') {
      errors.push('events must be an object')
    } else {
      for (const [eventType, eventConfig] of Object.entries(config.events)) {
        if (!Object.values(NOTIFICATION_TYPES).includes(eventType)) {
          errors.push(`Unknown event type: ${eventType}`)
        }

        if (eventConfig.channels) {
          if (!Array.isArray(eventConfig.channels)) {
            errors.push(`channels for ${eventType} must be an array`)
          } else {
            for (const channel of eventConfig.channels) {
              if (!Object.values(ALL_CHANNELS).includes(channel)) {
                errors.push(`Unknown channel: ${channel}`)
              }
            }
          }
        }
      }
    }
  }

  if (config.channels) {
    if (typeof config.channels !== 'object') {
      errors.push('channels must be an object')
    }
  }

  if (config.retry) {
    if (typeof config.retry !== 'object') {
      errors.push('retry must be an object')
    } else {
      if (config.retry.maxAttempts !== undefined) {
        if (typeof config.retry.maxAttempts !== 'number' ||
            config.retry.maxAttempts < 1 || config.retry.maxAttempts > 10) {
          errors.push('retry.maxAttempts must be between 1 and 10')
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function validateNotificationRequest(request) {
  const errors = []

  if (!request || typeof request !== 'object') {
    return { valid: false, errors: ['Request must be an object'] }
  }

  if (!request.applicationId) {
    errors.push('applicationId is required')
  }

  if (!request.type) {
    errors.push('type is required')
  } else if (!Object.values(NOTIFICATION_TYPES).includes(request.type)) {
    errors.push(`Invalid notification type: ${request.type}`)
  }

  if (request.channels) {
    if (!Array.isArray(request.channels)) {
      errors.push('channels must be an array')
    } else {
      for (const channel of request.channels) {
        if (!Object.values(ALL_CHANNELS).includes(channel)) {
          errors.push(`Invalid channel: ${channel}`)
        }
      }
    }
  } else {
    errors.push('At least one channel is required')
  }

  if (!request.recipients || !Array.isArray(request.recipients)) {
    errors.push('recipients must be an array')
  } else if (request.recipients.length === 0) {
    errors.push('At least one recipient is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function validateRecipient(recipient) {
  const errors = []

  if (!recipient || typeof recipient !== 'object') {
    return { valid: false, errors: ['Recipient must be an object'] }
  }

  if (!recipient.type) {
    errors.push('Recipient type is required')
  } else if (!Object.values(RECIPIENT_TYPES).includes(recipient.type)) {
    errors.push(`Invalid recipient type: ${recipient.type}`)
  }

  if (!recipient.address) {
    errors.push('Recipient address is required')
  } else if (typeof recipient.address !== 'string') {
    errors.push('Recipient address must be a string')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function sanitizeNotificationPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const sanitized = {}

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      sanitized[key] = value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
    } else if (typeof value === 'number' && isFinite(value)) {
      sanitized[key] = value
    } else if (typeof value === 'boolean') {
      sanitized[key] = value
    } else if (value === null) {
      sanitized[key] = null
    }
  }

  return sanitized
}

export default {
  NOTIFICATION_CONFIG_SCHEMA,
  validateNotificationConfiguration,
  validateNotificationRequest,
  validateRecipient,
  sanitizeNotificationPayload
}
