/**
 * P15.11.6 — WhatsApp Business Adapter
 *
 * Provider-agnostic WhatsApp adapter for notification delivery.
 */

import { NotificationAdapter } from '../notification.adapter.js'
import { WhatsAppValidationError, WhatsAppProviderError } from './whatsapp.errors.js'
import { PhoneValidator } from './whatsapp.validator.js'
import { WhatsAppTemplates } from './whatsapp.templates.js'

export class WhatsAppNotificationAdapter extends NotificationAdapter {
  #provider
  #validator
  #templates
  #deliveries
  #options

  constructor(options = {}) {
    super('whatsapp')

    this.#options = {
      mockMode: options.mockMode !== false,
      provider: options.provider || null,
      maxMessageLength: options.maxMessageLength || 4096,
      ...options
    }

    this.#provider = options.provider || null
    this.#validator = options.validator || new PhoneValidator()
    this.#templates = options.templates || WhatsAppTemplates.getDefault()
    this.#deliveries = []
  }

  get channel() {
    return 'whatsapp'
  }

  supports(channel) {
    return channel === 'whatsapp'
  }

  async send(context, notification) {
    const validation = this.#validator.validateNotification?.(notification) || { valid: true }
    if (!validation.valid) {
      return {
        success: false,
        channel: 'whatsapp',
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
        channel: 'whatsapp',
        notificationId: notification.id,
        error: 'No WhatsApp provider configured',
        code: 'PROVIDER_NOT_CONFIGURED'
      }
    }

    try {
      const message = this.#buildMessage(notification, context)
      const result = await this.#provider.sendMessage(message)

      const delivery = {
        notificationId: notification.id,
        channel: 'whatsapp',
        timestamp: new Date().toISOString(),
        status: 'delivered',
        messageId: result.messageId,
        provider: this.#provider.name
      }

      this.#deliveries.push(delivery)

      return {
        success: true,
        channel: 'whatsapp',
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
    const message = this.#buildMessage(notification, context)

    const delivery = {
      notificationId: notification.id,
      channel: 'whatsapp',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      data: {
        type: notification.type,
        to: message.to,
        text: message.text,
        applicationId: notification.applicationId,
        interactionId: notification.sourceInteractionId
      }
    }

    this.#deliveries.push(delivery)

    console.log(`[WhatsAppNotificationAdapter] Mock WhatsApp sent for notification ${notification.id}`)
    console.log(`  To: ${message.to}`)
    console.log(`  Text: ${message.text?.substring(0, 50)}...`)

    return {
      success: true,
      channel: 'whatsapp',
      notificationId: notification.id,
      deliveredAt: delivery.timestamp,
      messageId: `mock_${delivery.timestamp}`,
      provider: 'mock'
    }
  }

  #buildMessage(notification, context) {
    const template = this.#templates.getTemplate(notification.type)

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

    const phoneValidation = this.#validator.validatePhoneNumber(recipient)
    if (!phoneValidation.valid) {
      throw new WhatsAppValidationError(`Invalid phone number: ${phoneValidation.error}`)
    }

    const message = {
      to: phoneValidation.normalized,
      type: 'text',
      text: this.#truncateText(rendered.text),
      metadata: {
        notificationId: notification.id,
        applicationId: notification.applicationId,
        interactionId: notification.sourceInteractionId || '',
        correlationId: notification.correlationId || '',
        notificationType: notification.type
      }
    }

    return message
  }

  #resolveRecipient(notification, context) {
    const recipients = notification.recipients || []

    const companyContact = recipients.find(r => r.type === 'company_contact' || r.type === 'COMPANY_CONTACT')
    const applicationOwner = recipients.find(r => r.type === 'application_owner' || r.type === 'APPLICATION_OWNER')

    let phone = null

    if (companyContact?.phone) {
      phone = companyContact.phone
    } else if (applicationOwner?.phone) {
      phone = applicationOwner.phone
    } else if (context.applicationOwnerPhone) {
      phone = context.applicationOwnerPhone
    } else if (context.defaultPhone) {
      phone = context.defaultPhone
    } else if (context.companyWhatsApp) {
      phone = context.companyWhatsApp
    }

    return phone
  }

  #truncateText(text) {
    if (!text) return ''
    if (text.length <= this.#options.maxMessageLength) {
      return text
    }
    return text.substring(0, this.#options.maxMessageLength - 3) + '...'
  }

  #handleProviderError(error, notification) {
    const code = this.#mapErrorCode(error)

    console.error(`[WhatsAppNotificationAdapter] Delivery failed for ${notification.id}:`, error.message)

    return {
      success: false,
      channel: 'whatsapp',
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
    if (error.code === 'INVALID_RECIPIENT' || error.code === 'INVALID_PHONE') {
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
    if (error.code === 'MESSAGE_REJECTED') {
      return 'MESSAGE_REJECTED'
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
        channel: 'whatsapp',
        provider: 'mock',
        configured: true
      }
    }

    if (!this.#provider) {
      return {
        status: 'unconfigured',
        channel: 'whatsapp',
        provider: null,
        configured: false
      }
    }

    return {
      status: 'configured',
      channel: 'whatsapp',
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

export class MemoryWhatsAppAdapter extends WhatsAppNotificationAdapter {
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
        channel: 'whatsapp',
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
    return companyContact?.phone || null
  }

  getDeliveries() {
    return [...this.#deliveries]
  }

  getDeliveryCount() {
    return this.#deliveries.length
  }
}

export function createWhatsAppAdapter(options = {}) {
  return new WhatsAppNotificationAdapter(options)
}

export function createMemoryWhatsAppAdapter(options = {}) {
  return new MemoryWhatsAppAdapter(options)
}

export default {
  WhatsAppNotificationAdapter,
  MemoryWhatsAppAdapter,
  createWhatsAppAdapter,
  createMemoryWhatsAppAdapter
}
