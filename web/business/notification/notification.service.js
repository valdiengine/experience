/**
 * P15.11.4 — Notification Capability Core
 *
 * Notification service - orchestrates notification delivery.
 */

import {
  NotificationRequest,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUS,
  NOTIFICATION_ENVIRONMENTS,
  ALL_CHANNELS
} from './notification.model.js'

import {
  NotificationValidationError,
  NotificationNotFoundError,
  NotificationChannelUnsupportedError,
  NotificationRetryExhaustedError,
  NotificationIdempotencyError
} from './notification.errors.js'

import { validateNotificationRequest, sanitizeNotificationPayload } from './notification.schema.js'

import { NotificationTemplate, getDefaultTemplates } from './notification.template.js'

export class NotificationService {
  #persistence
  #adapters
  #templates
  #eventListeners
  #options

  constructor(options = {}) {
    this.#persistence = options.persistence
    this.#adapters = options.adapters || {}
    this.#templates = options.templates || getDefaultTemplates()
    this.#eventListeners = new Map()
    this.#options = {
      maxAttempts: options.maxAttempts || 3,
      allowedChannels: options.allowedChannels || null,
      ...options
    }
  }

  setPersistence(persistence) {
    this.#persistence = persistence
  }

  registerAdapter(channel, adapter) {
    this.#adapters[channel] = adapter
  }

  registerTemplate(name, template) {
    this.#templates[name] = template
  }

  createNotification(data, context = {}) {
    const validation = validateNotificationRequest(data)
    if (!validation.valid) {
      throw new NotificationValidationError('Invalid notification request', validation.errors)
    }

    const notificationData = {
      ...data,
      payload: sanitizeNotificationPayload(data.payload || {}),
      environment: context.preview ? NOTIFICATION_ENVIRONMENTS.PREVIEW : NOTIFICATION_ENVIRONMENTS.PRODUCTION
    }

    const notification = new NotificationRequest(notificationData)

    const saved = this.#persistence.create(notification)

    this.#emit('notification:created', saved)

    return saved
  }

  async createFromEvent(event, notificationConfig, context = {}) {
    if (!event || !event.applicationId) {
      throw new NotificationValidationError('Event with applicationId is required')
    }

    const eventType = this.#mapEventToNotificationType(event.type)
    if (!eventType) {
      return null
    }

    const eventConfig = notificationConfig?.events?.[eventType]
    if (!eventConfig || !eventConfig.enabled) {
      return null
    }

    const notificationData = {
      applicationId: event.applicationId,
      domain: event.domain,
      route: event.route,
      company: event.company,
      destination: event.destination,
      sourceInteractionId: event.payload?.interactionId || null,
      sourceEventId: event.id,
      correlationId: event.correlationId,
      type: eventType,
      channels: eventConfig.channels || [],
      recipients: this.#resolveRecipients(eventConfig.recipients, event, context),
      template: eventConfig.template,
      payload: this.#buildPayload(event, eventConfig),
      environment: context.preview ? NOTIFICATION_ENVIRONMENTS.PREVIEW : NOTIFICATION_ENVIRONMENTS.PRODUCTION
    }

    return this.createNotification(notificationData, context)
  }

  #mapEventToNotificationType(eventType) {
    const mapping = {
      'interaction:created': NOTIFICATION_TYPES.BUSINESS_INTERACTION_CREATED,
      'interaction:status_changed': NOTIFICATION_TYPES.BUSINESS_INTERACTION_STATUS_CHANGED,
      'quote:created': NOTIFICATION_TYPES.QUOTE_CREATED,
      'quote_request:created': NOTIFICATION_TYPES.QUOTE_CREATED,
      'contact_request:created': NOTIFICATION_TYPES.CONTACT_REQUEST_CREATED,
      'lead:created': NOTIFICATION_TYPES.LEAD_CREATED,
      'booking_request:created': NOTIFICATION_TYPES.BOOKING_REQUEST_CREATED
    }

    return mapping[eventType] || null
  }

  #resolveRecipients(recipientTypes, event, context) {
    const recipients = []

    for (const type of (recipientTypes || [])) {
      switch (type) {
        case 'application_owner':
          recipients.push({
            type: 'application_owner',
            address: context.applicationOwnerEmail || 'admin@example.com',
            name: 'Application Owner'
          })
          break
        case 'company_contact':
          recipients.push({
            type: 'company_contact',
            address: event.companyContactEmail || event.payload?.companyContactEmail || 'contact@example.com',
            name: event.companyName || 'Company'
          })
          break
        case 'customer':
          if (event.payload?.customerData?.email) {
            recipients.push({
              type: 'customer',
              address: event.payload.customerData.email,
              name: event.payload.customerData.name || 'Customer'
            })
          }
          break
      }
    }

    return recipients
  }

  #buildPayload(event, eventConfig) {
    const payload = {
      eventType: event.type,
      eventId: event.id,
      applicationId: event.applicationId,
      domain: event.domain,
      route: event.route,
      timestamp: event.timestamp || new Date().toISOString()
    }

    if (event.payload) {
      payload.interactionId = event.payload.interactionId
      payload.interactionType = event.payload.interactionType
      payload.status = event.payload.status

      if (event.payload.customerData) {
        payload.customerName = event.payload.customerData.name
        payload.customerEmail = event.payload.customerData.email
        payload.customerPhone = event.payload.customerData.phone
      }

      if (event.payload.total) {
        payload.quoteTotal = event.payload.total
        payload.currency = event.payload.currency || 'CLP'
      }
    }

    return payload
  }

  async processNotification(notificationId, context = {}) {
    const notification = this.#persistence.get(notificationId)
    if (!notification) {
      throw new NotificationNotFoundError(notificationId)
    }

    if (notification.status === NOTIFICATION_STATUS.DELIVERED ||
        notification.status === NOTIFICATION_STATUS.CANCELLED) {
      return notification
    }

    if (notification.status === NOTIFICATION_STATUS.PROCESSING) {
      return notification
    }

    if (notification.attempts >= notification.maxAttempts) {
      throw new NotificationRetryExhaustedError(notificationId, notification.attempts)
    }

    this.#persistence.markProcessing(notificationId)

    const updated = this.#persistence.get(notificationId)
    this.#emit('notification:processing', updated)

    const results = []

    for (const channel of notification.channels) {
      const adapter = this.#adapters[channel]
      if (!adapter) {
        console.warn(`No adapter for channel: ${channel}`)
        continue
      }

      try {
        const result = await adapter.send(context, notification)
        results.push(result)

        if (result.success) {
          this.#persistence.markDelivered(notificationId, channel)
        } else {
          this.#persistence.markFailed(notificationId, channel, result.error)
        }
      } catch (error) {
        this.#persistence.markFailed(notificationId, channel, error.message)
        results.push({
          success: false,
          channel,
          notificationId,
          error: error.message
        })
      }
    }

    const finalNotification = this.#persistence.get(notificationId)
    this.#emit(`notification:${finalNotification.status}`, finalNotification)

    return finalNotification
  }

  async retry(notificationId, context = {}) {
    const notification = this.#persistence.get(notificationId)
    if (!notification) {
      throw new NotificationNotFoundError(notificationId)
    }

    if (!NotificationRequest.canRetryFromJSON(notification)) {
      throw new NotificationRetryExhaustedError(notificationId, notification.attempts || 0)
    }

    return this.processNotification(notificationId, context)
  }

  async cancel(notificationId, context = {}) {
    const notification = this.#persistence.get(notificationId)
    if (!notification) {
      throw new NotificationNotFoundError(notificationId)
    }

    if (notification.isTerminal) {
      throw new Error('Cannot cancel terminal notification')
    }

    const updated = this.#persistence.markCancelled(notificationId)
    this.#emit('notification:cancelled', updated)

    return updated
  }

  get(notificationId) {
    return this.#persistence.get(notificationId)
  }

  list(applicationId, filters = {}) {
    return this.#persistence.list(applicationId, filters)
  }

  listByInteraction(sourceInteractionId, applicationId = null) {
    return this.#persistence.listByInteraction(sourceInteractionId, applicationId)
  }

  getStatistics(applicationId) {
    return this.#persistence.getStatistics(applicationId)
  }

  on(event, handler) {
    if (!this.#eventListeners.has(event)) {
      this.#eventListeners.set(event, new Set())
    }
    this.#eventListeners.get(event).add(handler)
  }

  off(event, handler) {
    if (this.#eventListeners.has(event)) {
      this.#eventListeners.get(event).delete(handler)
    }
  }

  #emit(event, data) {
    if (this.#eventListeners.has(event)) {
      for (const handler of this.#eventListeners.get(event)) {
        try {
          handler({ event, ...data })
        } catch (e) {
          console.error(`Event handler error for ${event}:`, e)
        }
      }
    }
  }

  renderTemplate(templateName, payload) {
    const template = this.#templates[templateName]
    if (!template) {
      throw new Error(`Template not found: ${templateName}`)
    }

    return template.render(payload)
  }

  health() {
    const adapters = {}
    for (const [channel, adapter] of Object.entries(this.#adapters)) {
      adapters[channel] = adapter.health()
    }

    return {
      status: 'healthy',
      persistence: !!this.#persistence,
      adapters,
      templates: Object.keys(this.#templates).length
    }
  }
}

export function createNotificationService(options = {}) {
  return new NotificationService(options)
}

export default {
  NotificationService,
  createNotificationService
}
