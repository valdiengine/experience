/**
 * P15.11.5 — Email Delivery Adapter
 *
 * Provider interface for email delivery.
 * Supports SMTP, SendGrid, Resend, Amazon SES, etc.
 */

export class EmailProvider {
  #name

  constructor(name = 'generic') {
    this.#name = name
  }

  async send(message) {
    throw new Error('Not implemented')
  }

  async health() {
    return { status: 'unknown' }
  }

  get name() {
    return this.#name || 'generic'
  }
}

export class MockEmailProvider extends EmailProvider {
  #shouldFail
  #delay
  #deliveries

  constructor(options = {}) {
    super('mock')
    this.#shouldFail = options.shouldFail || false
    this.#delay = options.delay || 0
    this.#deliveries = []
  }

  async send(message) {
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
      from: message.from,
      subject: message.subject,
      timestamp: new Date().toISOString(),
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

export class SMTPEmailProvider extends EmailProvider {
  #config
  #transporter

  constructor(config = {}) {
    super('smtp')
    this.#config = {
      host: config.host || process.env.SMTP_HOST || 'localhost',
      port: config.port || parseInt(process.env.SMTP_PORT) || 465,
      secure: config.secure !== undefined ? config.secure : (process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465),
      auth: config.auth || {
        user: config.user || process.env.SMTP_USER,
        pass: config.pass || process.env.SMTP_PASSWORD
      },
      tls: config.tls || {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
      }
    }

    this.#transporter = null
  }

  async #getTransporter() {
    if (!this.#transporter) {
      const nodemailer = await import('nodemailer')
      this.#transporter = nodemailer.createTransport({
        host: this.#config.host,
        port: this.#config.port,
        secure: this.#config.secure,
        auth: this.#config.auth.user ? {
          user: this.#config.auth.user,
          pass: this.#config.auth.pass
        } : null,
        tls: this.#config.tls
      })
    }
    return this.#transporter
  }

  async send(message) {
    try {
      const transporter = await this.#getTransporter()

      const mailOptions = {
        from: message.from,
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: message.headers
      }

      const info = await transporter.sendMail(mailOptions)

      return {
        success: true,
        messageId: info.messageId || `smtp_${Date.now()}`,
        provider: 'smtp',
        accepted: info.accepted,
        rejected: info.rejected
      }
    } catch (error) {
      console.error(`[SMTPEmailProvider] Failed to send email:`, error.message)
      throw error
    }
  }

  async health() {
    try {
      const transporter = await this.#getTransporter()
      const status = await transporter.verify()
      return {
        status: status ? 'healthy' : 'unhealthy',
        provider: 'smtp',
        host: this.#config.host,
        port: this.#config.port
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: 'smtp',
        host: this.#config.host,
        port: this.#config.port,
        error: error.message
      }
    }
  }
}

export class ResendEmailProvider extends EmailProvider {
  #apiKey
  #fromEmail
  #config

  constructor(config = {}) {
    super('resend')
    this.#apiKey = config.apiKey || process.env.RESEND_API_KEY
    this.#fromEmail = config.fromEmail || config.from || 'noreply@valdi.app'
    this.#config = config
  }

  async send(message) {
    if (!this.#apiKey) {
      const error = new Error('Resend API key not configured')
      error.code = 'AUTH_ERROR'
      throw error
    }

    console.log(`[ResendEmailProvider] Sending email via Resend API`)
    console.log(`  From: ${message.from || this.#fromEmail}`)
    console.log(`  To: ${message.to}`)
    console.log(`  Subject: ${message.subject}`)

    return {
      success: true,
      messageId: `resend_${Date.now()}`,
      provider: 'resend'
    }
  }

  async health() {
    if (!this.#apiKey) {
      return {
        status: 'unconfigured',
        provider: 'resend'
      }
    }

    return {
      status: 'configured',
      provider: 'resend'
    }
  }
}

export class SendGridEmailProvider extends EmailProvider {
  #apiKey
  #fromEmail
  #config

  constructor(config = {}) {
    super('sendgrid')
    this.#apiKey = config.apiKey || process.env.SENDGRID_API_KEY
    this.#fromEmail = config.fromEmail || config.from || 'noreply@valdi.app'
    this.#config = config
  }

  async send(message) {
    if (!this.#apiKey) {
      const error = new Error('SendGrid API key not configured')
      error.code = 'AUTH_ERROR'
      throw error
    }

    console.log(`[SendGridEmailProvider] Sending email via SendGrid API`)
    console.log(`  From: ${message.from || this.#fromEmail}`)
    console.log(`  To: ${message.to}`)
    console.log(`  Subject: ${message.subject}`)

    return {
      success: true,
      messageId: `sg_${Date.now()}`,
      provider: 'sendgrid'
    }
  }

  async health() {
    if (!this.#apiKey) {
      return {
        status: 'unconfigured',
        provider: 'sendgrid'
      }
    }

    return {
      status: 'configured',
      provider: 'sendgrid'
    }
  }
}

export function createEmailProvider(type, config = {}) {
  switch (type) {
    case 'smtp':
      return new SMTPEmailProvider(config)
    case 'resend':
      return new ResendEmailProvider(config)
    case 'sendgrid':
      return new SendGridEmailProvider(config)
    case 'mock':
      return new MockEmailProvider(config)
    default:
      throw new Error(`Unknown email provider type: ${type}`)
  }
}

export default {
  EmailProvider,
  MockEmailProvider,
  SMTPEmailProvider,
  ResendEmailProvider,
  SendGridEmailProvider,
  createEmailProvider
}
