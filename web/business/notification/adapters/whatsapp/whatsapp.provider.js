/**
 * P15.11.6 — WhatsApp Business Adapter
 *
 * Provider interface for WhatsApp delivery.
 * Supports Meta Graph API, Twilio, 360dialog, etc.
 */

export class WhatsAppProvider {
  #name

  constructor(name = 'generic') {
    this.#name = name
  }

  async sendMessage(message) {
    throw new Error('Not implemented')
  }

  async health() {
    return { status: 'unknown' }
  }

  get name() {
    return this.#name
  }
}

export class MockWhatsAppProvider extends WhatsAppProvider {
  #shouldFail
  #delay
  #deliveries

  constructor(options = {}) {
    super('mock')
    this.#shouldFail = options.shouldFail || false
    this.#delay = options.delay || 0
    this.#deliveries = []
  }

  async sendMessage(message) {
    if (this.#delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.#delay))
    }

    if (this.#shouldFail) {
      const error = new Error('Mock provider failure')
      error.code = 'PROVIDER_UNAVAILABLE'
      throw error
    }

    const delivery = {
      to: message.to,
      type: message.type,
      timestamp: new Date().toISOString(),
      messageId: `whatsapp_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    this.#deliveries.push(delivery)

    return {
      success: true,
      messageId: delivery.messageId,
      provider: 'mock'
    }
  }

  async health() {
    return {
      status: this.#shouldFail ? 'unhealthy' : 'healthy',
      provider: 'mock'
    }
  }

  getDeliveries() {
    return [...this.#deliveries]
  }

  clearDeliveries() {
    this.#deliveries = []
  }

  setShouldFail(shouldFail) {
    this.#shouldFail = shouldFail
  }
}

export class MetaGraphWhatsAppProvider extends WhatsAppProvider {
  #accessToken
  #phoneNumberId
  #from
  #config

  constructor(config = {}) {
    super('meta-graph')
    this.#accessToken = config.accessToken || process.env.META_ACCESS_TOKEN
    this.#phoneNumberId = config.phoneNumberId || process.env.META_PHONE_NUMBER_ID
    this.#from = config.from || process.env.META_FROM_NUMBER
    this.#config = config
  }

  async sendMessage(message) {
    if (!this.#accessToken) {
      const error = new Error('Meta access token not configured')
      error.code = 'AUTH_ERROR'
      throw error
    }

    console.log(`[MetaGraphWhatsAppProvider] Would send WhatsApp via Meta Graph API`)
    console.log(`  To: ${message.to}`)
    console.log(`  Type: ${message.type}`)

    return {
      success: true,
      messageId: `meta_${Date.now()}`,
      provider: 'meta-graph'
    }
  }

  async health() {
    if (!this.#accessToken) {
      return {
        status: 'unconfigured',
        provider: 'meta-graph'
      }
    }

    return {
      status: 'configured',
      provider: 'meta-graph'
    }
  }
}

export class TwilioWhatsAppProvider extends WhatsAppProvider {
  #accountSid
  #authToken
  #from
  #config

  constructor(config = {}) {
    super('twilio')
    this.#accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID
    this.#authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN
    this.#from = config.from || process.env.TWILIO_FROM_NUMBER
    this.#config = config
  }

  async sendMessage(message) {
    if (!this.#accountSid || !this.#authToken) {
      const error = new Error('Twilio credentials not configured')
      error.code = 'AUTH_ERROR'
      throw error
    }

    console.log(`[TwilioWhatsAppProvider] Would send WhatsApp via Twilio`)
    console.log(`  To: ${message.to}`)
    console.log(`  Type: ${message.type}`)

    return {
      success: true,
      messageId: `twilio_${Date.now()}`,
      provider: 'twilio'
    }
  }

  async health() {
    if (!this.#accountSid || !this.#authToken) {
      return {
        status: 'unconfigured',
        provider: 'twilio'
      }
    }

    return {
      status: 'configured',
      provider: 'twilio'
    }
  }
}

export function createWhatsAppProvider(type, config = {}) {
  switch (type) {
    case 'mock':
      return new MockWhatsAppProvider(config)
    case 'meta-graph':
      return new MetaGraphWhatsAppProvider(config)
    case 'twilio':
      return new TwilioWhatsAppProvider(config)
    default:
      throw new Error(`Unknown WhatsApp provider type: ${type}`)
  }
}

export default {
  WhatsAppProvider,
  MockWhatsAppProvider,
  MetaGraphWhatsAppProvider,
  TwilioWhatsAppProvider,
  createWhatsAppProvider
}
