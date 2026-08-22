/**
 * P15.11.0 — Capability Integration & Business Interaction Architecture Validation
 *
 * This is an ARCHITECTURE VALIDATION phase.
 * It does NOT implement Quote Calculator, WhatsApp, Email, or real notifications.
 * It defines the architecture required to implement those capabilities safely.
 *
 * Framework-free implementation.
 */

/**
 * Capability Types
 *
 * Distinguishes between different categories of capabilities.
 */
export const CAPABILITY_CATEGORY = Object.freeze({
  PRESENTATION: 'presentation',
  INTERACTIVE: 'interactive',
  BUSINESS: 'business',
  INTEGRATION: 'integration'
})

/**
 * Interactive Capabilities
 *
 * Capabilities that generate business events and interact with external systems.
 */
export const INTERACTIVE_CAPABILITY_TYPES = Object.freeze({
  QUOTE: 'quote',
  BOOKING: 'booking',
  CONTACT_FORM: 'contact-form',
  LEAD_CAPTURE: 'lead-capture',
  NOTIFICATION: 'notification',
  PAYMENT: 'payment'
})

/**
 * Integration Channel Types
 */
export const INTEGRATION_CHANNEL = Object.freeze({
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  SMS: 'sms',
  WEBPAY: 'webpay',
  EXTERNAL_API: 'external-api'
})

/**
 * Business Interaction Events
 *
 * Standard event types for business interactions.
 */
export const BUSINESS_EVENT_TYPES = Object.freeze({
  QUOTE_CREATED: 'quote:created',
  QUOTE_UPDATED: 'quote:updated',
  QUOTE_ACCEPTED: 'quote:accepted',
  QUOTE_REJECTED: 'quote:rejected',
  LEAD_CREATED: 'lead:created',
  LEAD_UPDATED: 'lead:updated',
  CONTACT_REQUEST_CREATED: 'contact:request_created',
  BOOKING_REQUESTED: 'booking:requested',
  BOOKING_CONFIRMED: 'booking:confirmed',
  BOOKING_CANCELLED: 'booking:cancelled',
  NOTIFICATION_REQUESTED: 'notification:requested',
  NOTIFICATION_SENT: 'notification:sent',
  NOTIFICATION_FAILED: 'notification:failed',
  PAYMENT_INITIATED: 'payment:initiated',
  PAYMENT_COMPLETED: 'payment:completed',
  PAYMENT_FAILED: 'payment:failed'
})

/**
 * Schema: CapabilityInteractionConfig
 *
 * Configuration schema for interactive capabilities.
 */
export const CAPABILITY_INTERACTION_SCHEMA = {
  type: 'object',
  properties: {
    capability: { type: 'string' },
    enabled: { type: 'boolean' },
    channels: {
      type: 'array',
      items: { type: 'string', enum: Object.values(INTEGRATION_CHANNEL) }
    },
    notificationTargets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          channel: { type: 'string' },
          address: { type: 'string' }
        }
      }
    },
    validation: {
      type: 'object',
      properties: {
        requiredFields: { type: 'array', items: { type: 'string' } },
        spamProtection: { type: 'boolean' },
        rateLimit: { type: 'number' }
      }
    },
    sandbox: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        mockNotifications: { type: 'boolean' },
        mockPayments: { type: 'boolean' }
      }
    }
  },
  required: ['capability', 'enabled']
}

/**
 * Schema: BusinessEvent
 *
 * Standard business event structure.
 */
export const BUSINESS_EVENT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    source: { type: 'string' },
    applicationId: { type: 'string' },
    domain: { type: 'string' },
    route: { type: 'string' },
    company: { type: 'string', nullable: true },
    destination: { type: 'string', nullable: true },
    timestamp: { type: 'string', format: 'date-time' },
    correlationId: { type: 'string' },
    payload: { type: 'object' }
  },
  required: ['id', 'type', 'source', 'applicationId', 'domain', 'route', 'timestamp', 'correlationId', 'payload']
}

/**
 * Schema: IntegrationRequest
 *
 * Integration adapter request structure.
 */
export const INTEGRATION_REQUEST_SCHEMA = {
  type: 'object',
  properties: {
    channel: { type: 'string', enum: Object.values(INTEGRATION_CHANNEL) },
    recipient: { type: 'string' },
    template: { type: 'string' },
    payload: { type: 'object' },
    applicationId: { type: 'string' },
    domain: { type: 'string' },
    route: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
    scheduledAt: { type: 'string', format: 'date-time', nullable: true }
  },
  required: ['channel', 'recipient', 'template', 'payload', 'applicationId']
}

/**
 * Schema: NotificationRequest
 *
 * Notification-specific request structure.
 */
export const NOTIFICATION_REQUEST_SCHEMA = {
  type: 'object',
  properties: {
    eventType: { type: 'string' },
    channels: { type: 'array', items: { type: 'string' } },
    recipient: { type: 'string' },
    templateId: { type: 'string' },
    variables: { type: 'object' },
    applicationId: { type: 'string' },
    domain: { type: 'string' },
    route: { type: 'string' },
    isPreview: { type: 'boolean' }
  },
  required: ['eventType', 'channels', 'recipient', 'templateId', 'applicationId']
}

/**
 * Schema: BusinessInteraction
 *
 * Represents a business interaction record.
 */
export const BUSINESS_INTERACTION_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    applicationId: { type: 'string' },
    domain: { type: 'string' },
    route: { type: 'string' },
    company: { type: 'string', nullable: true },
    destination: { type: 'string', nullable: true },
    status: { type: 'string' },
    payload: { type: 'object' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'type', 'applicationId', 'domain', 'route', 'status', 'createdAt']
}

/**
 * Architecture Validator
 *
 * Validates that the architecture supports interactive capabilities correctly.
 */
export class CapabilityInteractionValidator {
  #errors
  #warnings

  constructor() {
    this.#errors = []
    this.#warnings = []
  }

  validateCapabilitySchema(schema) {
    this.#errors = []
    this.#warnings = []

    if (!schema) {
      this.#errors.push('Schema is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (!schema.capability) {
      this.#errors.push('Schema must include capability name')
    }

    if (typeof schema.enabled !== 'boolean') {
      this.#errors.push('Schema must include enabled boolean')
    }

    if (schema.channels) {
      if (!Array.isArray(schema.channels)) {
        this.#errors.push('Channels must be an array')
      } else {
        for (const channel of schema.channels) {
          if (!Object.values(INTEGRATION_CHANNEL).includes(channel)) {
            this.#errors.push(`Invalid channel: ${channel}`)
          }
        }
      }
    }

    if (schema.notificationTargets) {
      if (!Array.isArray(schema.notificationTargets)) {
        this.#errors.push('notificationTargets must be an array')
      }
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  validateBusinessEvent(event) {
    this.#errors = []
    this.#warnings = []

    if (!event) {
      this.#errors.push('Event is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (!event.id) {
      this.#errors.push('Event must have id')
    }

    if (!event.type) {
      this.#errors.push('Event must have type')
    }

    if (!event.domain) {
      this.#errors.push('Event must have domain')
    }

    if (!event.route) {
      this.#errors.push('Event must have route')
    }

    if (!event.correlationId) {
      this.#warnings.push('Event should have correlationId for tracing')
    }

    if (!event.timestamp) {
      this.#errors.push('Event must have timestamp')
    }

    if (!event.payload) {
      this.#errors.push('Event must have payload')
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  validateApplicationIsolation(event, applicationId) {
    this.#errors = []
    this.#warnings = []

    if (!event) {
      this.#errors.push('Event is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (event.applicationId !== applicationId) {
      this.#errors.push(`Event applicationId mismatch: expected ${applicationId}, got ${event.applicationId}`)
    }

    if (event.domain && applicationId.includes('/')) {
      const expectedDomain = applicationId.split('/')[0]
      if (event.domain !== expectedDomain) {
        this.#errors.push(`Domain isolation violation: ${event.domain} cannot affect ${applicationId}`)
      }
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  validateIntegrationRequest(request) {
    this.#errors = []
    this.#warnings = []

    if (!request) {
      this.#errors.push('Request is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (!request.channel) {
      this.#errors.push('Request must have channel')
    } else if (!Object.values(INTEGRATION_CHANNEL).includes(request.channel)) {
      this.#errors.push(`Invalid channel: ${request.channel}`)
    }

    if (!request.recipient) {
      this.#errors.push('Request must have recipient')
    }

    if (!request.applicationId) {
      this.#errors.push('Request must have applicationId')
    }

    if (request.isPreview && request.recipient) {
      this.#warnings.push('Preview mode should not send to real recipients')
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  validateNotificationRequest(request) {
    this.#errors = []
    this.#warnings = []

    if (!request) {
      this.#errors.push('Request is required')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    if (!request.eventType) {
      this.#errors.push('Request must have eventType')
    }

    if (!request.channels || !Array.isArray(request.channels)) {
      this.#errors.push('Request must have channels array')
    }

    if (!request.recipient) {
      this.#errors.push('Request must have recipient')
    }

    if (!request.templateId) {
      this.#errors.push('Request must have templateId')
    }

    if (!request.applicationId) {
      this.#errors.push('Request must have applicationId')
    }

    if (request.isPreview) {
      this.#warnings.push('Preview notification - should use sandbox mode')
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }

  validateCapabilityComposition(capabilities, dependencies) {
    this.#errors = []
    this.#warnings = []

    if (!capabilities || !Array.isArray(capabilities)) {
      this.#errors.push('Capabilities must be an array')
      return { valid: false, errors: this.#errors, warnings: this.#warnings }
    }

    for (const capability of capabilities) {
      if (!capability.name) {
        this.#errors.push('Each capability must have a name')
        continue
      }

      if (capability.dependencies) {
        for (const dep of capability.dependencies) {
          if (!capabilities.find(c => c.name === dep)) {
            this.#errors.push(`Missing dependency: ${dep} required by ${capability.name}`)
          }
        }
      }
    }

    if (dependencies) {
      for (const dep of dependencies) {
        if (!capabilities.find(c => c.name === dep)) {
          this.#warnings.push(`Unmet optional dependency: ${dep}`)
        }
      }
    }

    return {
      valid: this.#errors.length === 0,
      errors: this.#errors,
      warnings: this.#warnings
    }
  }
}

export function createCapabilityInteractionValidator() {
  return new CapabilityInteractionValidator()
}

export default {
  CAPABILITY_CATEGORY,
  INTERACTIVE_CAPABILITY_TYPES,
  INTEGRATION_CHANNEL,
  BUSINESS_EVENT_TYPES,
  CAPABILITY_INTERACTION_SCHEMA,
  BUSINESS_EVENT_SCHEMA,
  INTEGRATION_REQUEST_SCHEMA,
  NOTIFICATION_REQUEST_SCHEMA,
  BUSINESS_INTERACTION_SCHEMA,
  CapabilityInteractionValidator,
  createCapabilityInteractionValidator
}