/**
 * P15.11.4 — Notification Capability Core
 *
 * Notification model, types, and schemas.
 */

export const NOTIFICATION_TYPES = Object.freeze({
  QUOTE_CREATED: 'quote_created',
  QUOTE_STATUS_CHANGED: 'quote_status_changed',
  CONTACT_REQUEST_CREATED: 'contact_request_created',
  LEAD_CREATED: 'lead_created',
  BOOKING_REQUEST_CREATED: 'booking_request_created',
  BUSINESS_INTERACTION_CREATED: 'business_interaction_created',
  BUSINESS_INTERACTION_STATUS_CHANGED: 'business_interaction_status_changed'
})

export const NOTIFICATION_CHANNELS = Object.freeze({
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  WEB_PUSH: 'web_push',
  EXTERNAL: 'external'
})

export const INTERNAL_CHANNELS = Object.freeze({
  CONSOLE: 'console',
  MEMORY: 'memory'
})

export const ALL_CHANNELS = Object.freeze({
  ...NOTIFICATION_CHANNELS,
  ...INTERNAL_CHANNELS
})

export const NOTIFICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
})

export const NOTIFICATION_EVENT_TYPES = Object.freeze({
  CREATED: 'notification:created',
  PROCESSING: 'notification:processing',
  DELIVERED: 'notification:delivered',
  FAILED: 'notification:failed',
  RETRIED: 'notification:retried',
  CANCELLED: 'notification:cancelled'
})

export const NOTIFICATION_ENVIRONMENTS = Object.freeze({
  PREVIEW: 'preview',
  PRODUCTION: 'production'
})

export const RECIPIENT_TYPES = Object.freeze({
  APPLICATION_OWNER: 'application_owner',
  COMPANY_CONTACT: 'company_contact',
  CUSTOMER: 'customer',
  CUSTOM: 'custom'
})

export class NotificationRequest {
  #id
  #applicationId
  #domain
  #route
  #company
  #destination
  #sourceInteractionId
  #sourceEventId
  #correlationId
  #type
  #channels
  #recipients
  #template
  #payload
  #status
  #attempts
  #maxAttempts
  #deliveries
  #createdAt
  #updatedAt
  #deliveredAt
  #environment
  #metadata

  constructor(data = {}) {
    this.#id = data.id || this.#generateId()
    this.#applicationId = data.applicationId || null
    this.#domain = data.domain || null
    this.#route = data.route || null
    this.#company = data.company || null
    this.#destination = data.destination || null
    this.#sourceInteractionId = data.sourceInteractionId || null
    this.#sourceEventId = data.sourceEventId || null
    this.#correlationId = data.correlationId || this.#generateCorrelationId()
    this.#type = data.type || null
    this.#channels = data.channels || []
    this.#recipients = data.recipients || []
    this.#template = data.template || null
    this.#payload = data.payload || {}
    this.#status = data.status || NOTIFICATION_STATUS.PENDING
    this.#attempts = data.attempts || 0
    this.#maxAttempts = data.maxAttempts || 3
    this.#deliveries = data.deliveries || {}
    this.#createdAt = data.createdAt || new Date().toISOString()
    this.#updatedAt = data.updatedAt || new Date().toISOString()
    this.#deliveredAt = data.deliveredAt || null
    this.#environment = data.environment || NOTIFICATION_ENVIRONMENTS.PRODUCTION
    this.#metadata = data.metadata || {}
  }

  #generateId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `notif_${timestamp}${random}`
  }

  #generateCorrelationId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `corr_notif_${timestamp}${random}`
  }

  get id() {
    return this.#id
  }

  get applicationId() {
    return this.#applicationId
  }

  get domain() {
    return this.#domain
  }

  get route() {
    return this.#route
  }

  get company() {
    return this.#company
  }

  get destination() {
    return this.#destination
  }

  get sourceInteractionId() {
    return this.#sourceInteractionId
  }

  get sourceEventId() {
    return this.#sourceEventId
  }

  get correlationId() {
    return this.#correlationId
  }

  get type() {
    return this.#type
  }

  get channels() {
    return [...this.#channels]
  }

  get recipients() {
    return [...this.#recipients]
  }

  get template() {
    return this.#template
  }

  get payload() {
    return { ...this.#payload }
  }

  get status() {
    return this.#status
  }

  get attempts() {
    return this.#attempts
  }

  get maxAttempts() {
    return this.#maxAttempts
  }

  get deliveries() {
    return { ...this.#deliveries }
  }

  get createdAt() {
    return this.#createdAt
  }

  get updatedAt() {
    return this.#updatedAt
  }

  get deliveredAt() {
    return this.#deliveredAt
  }

  get environment() {
    return this.#environment
  }

  get metadata() {
    return { ...this.#metadata }
  }

  get canRetry() {
    return this.#attempts < this.#maxAttempts &&
           (this.#status === NOTIFICATION_STATUS.PENDING ||
            this.#status === NOTIFICATION_STATUS.FAILED)
  }

  get isTerminal() {
    return this.#status === NOTIFICATION_STATUS.DELIVERED ||
           this.#status === NOTIFICATION_STATUS.CANCELLED
  }

  markProcessing() {
    this.#status = NOTIFICATION_STATUS.PROCESSING
    this.#attempts++
    this.#updatedAt = new Date().toISOString()
  }

  markDelivered(channel = null) {
    if (channel) {
      this.#deliveries[channel] = {
        status: NOTIFICATION_STATUS.DELIVERED,
        deliveredAt: new Date().toISOString()
      }
    }

    const allDelivered = Object.values(this.#deliveries).every(
      d => d.status === NOTIFICATION_STATUS.DELIVERED
    )

    if (allDelivered || !channel) {
      this.#status = NOTIFICATION_STATUS.DELIVERED
      this.#deliveredAt = new Date().toISOString()
    }

    this.#updatedAt = new Date().toISOString()
  }

  markFailed(channel = null, error = null) {
    if (channel) {
      this.#deliveries[channel] = {
        status: NOTIFICATION_STATUS.FAILED,
        error: error || null,
        failedAt: new Date().toISOString()
      }
    }

    if (!channel) {
      this.#status = NOTIFICATION_STATUS.FAILED
    }

    this.#updatedAt = new Date().toISOString()
  }

  markCancelled() {
    this.#status = NOTIFICATION_STATUS.CANCELLED
    this.#updatedAt = new Date().toISOString()
  }

  updatePayload(updates) {
    this.#payload = { ...this.#payload, ...updates }
    this.#updatedAt = new Date().toISOString()
  }

  updateMetadata(updates) {
    this.#metadata = { ...this.#metadata, ...updates }
    this.#updatedAt = new Date().toISOString()
  }

  toJSON() {
    return {
      id: this.#id,
      applicationId: this.#applicationId,
      domain: this.#domain,
      route: this.#route,
      company: this.#company,
      destination: this.#destination,
      sourceInteractionId: this.#sourceInteractionId,
      sourceEventId: this.#sourceEventId,
      correlationId: this.#correlationId,
      type: this.#type,
      channels: [...this.#channels],
      recipients: [...this.#recipients],
      template: this.#template,
      payload: { ...this.#payload },
      status: this.#status,
      attempts: this.#attempts,
      maxAttempts: this.#maxAttempts,
      deliveries: { ...this.#deliveries },
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
      deliveredAt: this.#deliveredAt,
      environment: this.#environment,
      metadata: { ...this.#metadata }
    }
  }

  toEvent() {
    return {
      id: `evt_notif_${this.#id}`,
      type: NOTIFICATION_EVENT_TYPES.CREATED,
      source: 'notification-capability',
      applicationId: this.#applicationId,
      domain: this.#domain,
      route: this.#route,
      company: this.#company,
      destination: this.#destination,
      timestamp: new Date().toISOString(),
      correlationId: this.#correlationId,
      payload: {
        notificationId: this.#id,
        notificationType: this.#type,
        status: this.#status,
        environment: this.#environment,
        channels: [...this.#channels]
      }
    }
  }

  freeze() {
    return Object.freeze(this.toJSON())
  }

  static fromJSON(json) {
    return new NotificationRequest(json)
  }

  static canRetryFromJSON(json) {
    if (!json) return false
    const { attempts = 0, maxAttempts = 3, status } = json
    return attempts < maxAttempts &&
           (status === NOTIFICATION_STATUS.PENDING ||
            status === NOTIFICATION_STATUS.FAILED)
  }

  static getTypes() {
    return { ...NOTIFICATION_TYPES }
  }

  static getChannels() {
    return { ...NOTIFICATION_CHANNELS }
  }

  static getStatuses() {
    return { ...NOTIFICATION_STATUS }
  }

  static getEnvironments() {
    return { ...NOTIFICATION_ENVIRONMENTS }
  }

  static getRecipientTypes() {
    return { ...RECIPIENT_TYPES }
  }

  static isValidType(type) {
    return Object.values(NOTIFICATION_TYPES).includes(type)
  }

  static isValidChannel(channel) {
    return Object.values(NOTIFICATION_CHANNELS).includes(channel)
  }

  static isValidStatus(status) {
    return Object.values(NOTIFICATION_STATUS).includes(status)
  }
}

export function createNotificationRequest(data = {}) {
  return new NotificationRequest(data)
}

export default {
  NotificationRequest,
  createNotificationRequest,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUS,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_ENVIRONMENTS,
  RECIPIENT_TYPES
}
