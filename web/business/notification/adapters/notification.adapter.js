/**
 * P15.11.4 — Notification Capability Core
 *
 * Notification channel adapter contract.
 */

export class NotificationAdapter {
  constructor(channel) {
    this.#channel = channel
  }

  #channel

  get channel() {
    return this.#channel
  }

  async send(context, notification) {
    throw new Error('Not implemented')
  }

  supports(channel) {
    return channel === this.#channel
  }

  health() {
    return { status: 'unknown', channel: this.#channel }
  }
}

export class ConsoleNotificationAdapter extends NotificationAdapter {
  #deliveries

  constructor() {
    super('console')
    this.#deliveries = []
  }

  async send(context, notification) {
    const delivery = {
      notificationId: notification.id,
      channel: 'console',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      data: {
        type: notification.type,
        recipients: notification.recipients,
        payload: notification.payload
      }
    }

    this.#deliveries.push(delivery)

    console.log('[ConsoleNotificationAdapter]', JSON.stringify(delivery, null, 2))

    return {
      success: true,
      channel: 'console',
      notificationId: notification.id,
      deliveredAt: delivery.timestamp,
      messageId: `console_${delivery.timestamp}`
    }
  }

  supports(channel) {
    return channel === 'console' || channel === 'test'
  }

  health() {
    return {
      status: 'healthy',
      channel: 'console',
      deliveriesCount: this.#deliveries.length
    }
  }

  getDeliveries() {
    return [...this.#deliveries]
  }

  clearDeliveries() {
    this.#deliveries = []
  }
}

export class InMemoryNotificationAdapter extends NotificationAdapter {
  #deliveries
  #failOnSend

  constructor(options = {}) {
    super(options.channel || 'memory')
    this.#deliveries = []
    this.#failOnSend = options.failOnSend || false
  }

  async send(context, notification) {
    if (this.#failOnSend) {
      const error = new Error('Simulated delivery failure')
      return {
        success: false,
        channel: this.channel,
        notificationId: notification.id,
        error: error.message
      }
    }

    const delivery = {
      notificationId: notification.id,
      channel: this.channel,
      timestamp: new Date().toISOString(),
      status: 'delivered',
      data: {
        type: notification.type,
        recipients: notification.recipients,
        payload: notification.payload
      }
    }

    this.#deliveries.push(delivery)

    return {
      success: true,
      channel: this.channel,
      notificationId: notification.id,
      deliveredAt: delivery.timestamp,
      messageId: `${this.channel}_${delivery.timestamp}`
    }
  }

  supports(channel) {
    return channel === this.channel || channel === 'memory'
  }

  health() {
    return {
      status: 'healthy',
      channel: this.channel,
      deliveriesCount: this.#deliveries.length
    }
  }

  getDeliveries() {
    return [...this.#deliveries]
  }

  clearDeliveries() {
    this.#deliveries = []
  }

  setFailOnSend(fail) {
    this.#failOnSend = fail
  }
}

export class EmailNotificationAdapter extends NotificationAdapter {
  constructor(options = {}) {
    super('email')
    this.#mockMode = options.mockMode !== false
    this.#deliveries = []
  }

  #mockMode
  #deliveries

  async send(context, notification) {
    if (this.#mockMode) {
      return this.#mockSend(notification)
    }
    throw new Error('Real email delivery not implemented')
  }

  async #mockSend(notification) {
    const delivery = {
      notificationId: notification.id,
      channel: 'email',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      data: {
        type: notification.type,
        recipients: notification.recipients,
        payload: notification.payload
      }
    }

    this.#deliveries.push(delivery)

    console.log(`[EmailNotificationAdapter] Mock email sent for notification ${notification.id}`)

    return {
      success: true,
      channel: 'email',
      notificationId: notification.id,
      deliveredAt: delivery.timestamp,
      messageId: `email_${delivery.timestamp}`
    }
  }

  supports(channel) {
    return channel === 'email'
  }

  health() {
    return {
      status: this.#mockMode ? 'mock' : 'unconfigured',
      channel: 'email',
      deliveriesCount: this.#deliveries.length
    }
  }

  getDeliveries() {
    return [...this.#deliveries]
  }
}

export class WhatsAppNotificationAdapter extends NotificationAdapter {
  constructor(options = {}) {
    super('whatsapp')
    this.#mockMode = options.mockMode !== false
    this.#deliveries = []
  }

  #mockMode
  #deliveries

  async send(context, notification) {
    if (this.#mockMode) {
      return this.#mockSend(notification)
    }
    throw new Error('Real WhatsApp delivery not implemented')
  }

  async #mockSend(notification) {
    const delivery = {
      notificationId: notification.id,
      channel: 'whatsapp',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      data: {
        type: notification.type,
        recipients: notification.recipients,
        payload: notification.payload
      }
    }

    this.#deliveries.push(delivery)

    console.log(`[WhatsAppNotificationAdapter] Mock WhatsApp sent for notification ${notification.id}`)

    return {
      success: true,
      channel: 'whatsapp',
      notificationId: notification.id,
      deliveredAt: delivery.timestamp,
      messageId: `whatsapp_${delivery.timestamp}`
    }
  }

  supports(channel) {
    return channel === 'whatsapp'
  }

  health() {
    return {
      status: this.#mockMode ? 'mock' : 'unconfigured',
      channel: 'whatsapp',
      deliveriesCount: this.#deliveries.length
    }
  }

  getDeliveries() {
    return [...this.#deliveries]
  }
}

export function createTestAdapterSet() {
  return {
    console: new ConsoleNotificationAdapter(),
    email: new EmailNotificationAdapter({ mockMode: true }),
    whatsapp: new WhatsAppNotificationAdapter({ mockMode: true }),
    memory: new InMemoryNotificationAdapter({ channel: 'memory' })
  }
}

export default {
  NotificationAdapter,
  ConsoleNotificationAdapter,
  InMemoryNotificationAdapter,
  EmailNotificationAdapter,
  WhatsAppNotificationAdapter,
  createTestAdapterSet
}
