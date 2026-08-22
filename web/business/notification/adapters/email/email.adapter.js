/**
 * P15.11.5 — Email Delivery Adapter
 *
 * Provider-agnostic email adapter for notification delivery.
 */

import { NotificationAdapter } from '../notification.adapter.js'
import { EmailValidationError, EmailProviderError } from './email.errors.js'
import { EmailValidator } from './email.validator.js'
import { EmailTemplates } from './email.templates.js'

export class EmailNotificationAdapter extends NotificationAdapter {
  #provider
  #validator
  #templates
  #deliveries
  #options

  constructor(options = {}) {
    super('email')

    this.#options = {
      mockMode: options.mockMode !== false,
      provider: options.provider || null,
      maxSubjectLength: options.maxSubjectLength || 200,
      maxBodyLength: options.maxBodyLength || 50000,
      ...options
    }

    this.#provider = options.provider || null
    this.#validator = options.validator || new EmailValidator()
    this.#templates = options.templates || EmailTemplates.getDefault()
    this.#deliveries = []
  }

  get channel() {
    return 'email'
  }

  supports(channel) {
    return channel === 'email'
  }

  async send(context, notification) {
    const validation = this.#validator.validateNotification(notification)
    if (!validation.valid) {
      return {
        success: false,
        channel: 'email',
        notificationId: notification.id,
        error: validation.error,
        code: 'VALIDATION_ERROR'
      }
    }

    if (this.#options.mockMode) {
      return this.#mockSend(notification, context)
    }

    if (!this.#provider) {
      return {
        success: false,
        channel: 'email',
        notificationId: notification.id,
        error: 'No email provider configured',
        code: 'PROVIDER_NOT_CONFIGURED'
      }
    }

    try {
      const emailMessage = this.#buildEmailMessage(notification, context)
      const result = await this.#provider.send(emailMessage)

      const delivery = {
        notificationId: notification.id,
        channel: 'email',
        timestamp: new Date().toISOString(),
        status: 'delivered',
        messageId: result.messageId,
        provider: this.#provider.name
      }

      this.#deliveries.push(delivery)

      return {
        success: true,
        channel: 'email',
        notificationId: notification.id,
        deliveredAt: delivery.timestamp,
        messageId: result.messageId,
        provider: this.#provider.name
      }
    } catch (error) {
      return this.#handleProviderError(error, notification)
    }
  }

  #mockSend(notification, context) {
    const emailMessage = this.#buildEmailMessage(notification, context)

    const delivery = {
      notificationId: notification.id,
      channel: 'email',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      data: {
        type: notification.type,
        to: emailMessage.to,
        subject: emailMessage.subject,
        applicationId: notification.applicationId,
        interactionId: notification.sourceInteractionId
      }
    }

    this.#deliveries.push(delivery)

    console.log(`[EmailNotificationAdapter] Mock email sent for notification ${notification.id}`)
    console.log(`  To: ${emailMessage.to}`)
    console.log(`  Subject: ${emailMessage.subject}`)

    return {
      success: true,
      channel: 'email',
      notificationId: notification.id,
      deliveredAt: delivery.timestamp,
      messageId: `mock_${delivery.timestamp}`,
      provider: 'mock'
    }
  }

  #buildEmailMessage(notification, context) {
    const template = this.#templates.getTemplate(notification.type, 'email')

    const templateData = {
      applicationId: notification.applicationId,
      interactionId: notification.sourceInteractionId,
      notificationId: notification.id,
      correlationId: notification.correlationId,
      domain: notification.domain,
      route: notification.route,
      ...notification.payload
    }

    const rendered = template.render(templateData)

    const recipient = this.#resolveRecipient(notification, context)

    const message = {
      from: this.#sanitizeHeader(typeof recipient.from === 'string' ? recipient.from : (this.#options.defaultFrom || 'noreply@valdi.app')),
      to: this.#sanitizeEmailAddress(recipient.to),
      replyTo: this.#sanitizeEmailAddress(recipient.replyTo),
      subject: this.#truncateSubject(this.#sanitizeSubject(rendered.subject)),
      text: rendered.text,
      html: rendered.html,
      headers: {
        'X-Notification-Id': notification.id,
        'X-Application-Id': notification.applicationId,
        'X-Interaction-Id': notification.sourceInteractionId || '',
        'X-Correlation-Id': notification.correlationId || '',
        'X-Notification-Type': notification.type
      }
    }

    return message
  }

  #resolveRecipient(notification, context) {
    const recipients = notification.recipients || []

    const companyContact = recipients.find(r => r.type === 'company_contact' || r.type === 'COMPANY_CONTACT')
    const applicationOwner = recipients.find(r => r.type === 'application_owner' || r.type === 'APPLICATION_OWNER')
    const customer = recipients.find(r => r.type === 'customer' || r.type === 'CUSTOMER')

    let to = null
    let from = null
    let replyTo = null

    if (companyContact && companyContact.address) {
      to = companyContact.address
      from = companyContact.from || null
      replyTo = customer && customer.address ? customer.address : null
    } else if (applicationOwner && applicationOwner.address) {
      to = applicationOwner.address
      from = applicationOwner.from || null
    } else if (customer && customer.address) {
      to = customer.address
      from = customer.from || null
      replyTo = null
    } else if (context.defaultTo) {
      to = context.defaultTo
    } else if (context.companyContactEmail) {
      to = context.companyContactEmail
    }

    if (!to) {
      return { to: null, from: null, replyTo: null }
    }

    return { to, from, replyTo }
  }

  #sanitizeEmailAddress(address) {
    if (!address) return null
    return this.#validator.sanitizeEmailAddress(address)
  }

  #sanitizeHeader(value) {
    if (!value) return null
    return this.#validator.sanitizeHeaderValue(value)
  }

  #sanitizeSubject(subject) {
    if (!subject) return ''
    return this.#validator.sanitizeSubject(subject)
  }

  #truncateSubject(subject) {
    if (subject.length <= this.#options.maxSubjectLength) {
      return subject
    }
    return subject.substring(0, this.#options.maxSubjectLength - 3) + '...'
  }

  #handleProviderError(error, notification) {
    const code = this.#mapErrorCode(error)

    console.error(`[EmailNotificationAdapter] Delivery failed for ${notification.id}:`, error.message)

    return {
      success: false,
      channel: 'email',
      notificationId: notification.id,
      error: this.#sanitizeErrorMessage(error.message),
      code,
      retryable: this.#isRetryableError(code)
    }
  }

  #mapErrorCode(error) {
    if (error.code === 'AUTH_ERROR' || error.code === 'INVALID_CREDENTIALS') {
      return 'AUTH_ERROR'
    }
    if (error.code === 'INVALID_RECIPIENT' || error.code === 'RECIPIENT_REJECTED') {
      return 'INVALID_RECIPIENT'
    }
    if (error.code === 'RATE_LIMIT' || error.code === 'THROTTLE') {
      return 'RATE_LIMITED'
    }
    if (error.code === 'PROVIDER_UNAVAILABLE' || error.code === 'SERVICE_UNAVAILABLE') {
      return 'PROVIDER_UNAVAILABLE'
    }
    if (error.code === 'TIMEOUT') {
      return 'TIMEOUT'
    }
    if (error.code === 'DELIVERY_REJECTED') {
      return 'DELIVERY_REJECTED'
    }
    return 'UNKNOWN_PROVIDER_ERROR'
  }

  #isRetryableError(code) {
    return ['RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'TIMEOUT', 'UNKNOWN_PROVIDER_ERROR'].includes(code)
  }

  #sanitizeErrorMessage(message) {
    if (!message) return 'Unknown error'
    return message.substring(0, 200)
  }

  health() {
    if (this.#options.mockMode) {
      return {
        status: 'mock',
        channel: 'email',
        provider: 'mock',
        configured: true
      }
    }

    if (!this.#provider) {
      return {
        status: 'unconfigured',
        channel: 'email',
        provider: null,
        configured: false
      }
    }

    return {
      status: 'configured',
      channel: 'email',
      provider: this.#provider.name || 'unknown',
      configured: true
    }
  }

  getDeliveries() {
    return [...this.#deliveries]
  }

  clearDeliveries() {
    this.#deliveries = []
  }
}

export class MemoryEmailAdapter extends EmailNotificationAdapter {
  #deliveries

  constructor(options = {}) {
    super({ ...options, mockMode: true })
    this.#deliveries = []
  }

  async send(context, notification) {
    const result = await super.send(context, notification)

    if (result.success) {
      this.#deliveries.push({
        notificationId: notification.id,
        channel: 'email',
        timestamp: result.deliveredAt,
        status: 'delivered',
        messageId: result.messageId,
        to: this.#extractTo(notification)
      })
    }

    return result
  }

  #extractTo(notification) {
    const recipients = notification.recipients || []
    const companyContact = recipients.find(r => r.type === 'company_contact')
    return companyContact?.address || null
  }

  getDeliveries() {
    return [...this.#deliveries]
  }

  getDeliveryCount() {
    return this.#deliveries.length
  }
}

export function createEmailAdapter(options = {}) {
  return new EmailNotificationAdapter(options)
}

export function createMemoryEmailAdapter(options = {}) {
  return new MemoryEmailAdapter(options)
}

export default {
  EmailNotificationAdapter,
  MemoryEmailAdapter,
  createEmailAdapter,
  createMemoryEmailAdapter
}
