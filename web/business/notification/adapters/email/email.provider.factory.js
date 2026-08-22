/**
 * LIVE-1 — Production Adapter Factory
 *
 * Creates production-ready adapter sets based on environment configuration.
 * Supports real email providers while maintaining security boundaries.
 */

import { SMTPEmailProvider, MockEmailProvider } from './email.provider.js'

export function createProductionAdapterSet(options = {}) {
  const emailProviderType = options.emailProvider || process.env.EMAIL_PROVIDER || 'mock'
  const mockMode = emailProviderType === 'mock'

  let emailProvider
  if (mockMode) {
    emailProvider = new MockEmailProvider()
  } else if (emailProviderType === 'smtp') {
    emailProvider = new SMTPEmailProvider({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    })
  } else {
    console.warn(`[EmailProviderFactory] Unknown provider type: ${emailProviderType}, using mock`)
    emailProvider = new MockEmailProvider()
  }

  return {
    email: createRealEmailAdapter(emailProvider, mockMode),
    mockMode
  }
}

function createRealEmailAdapter(provider, mockMode) {
  return {
    channel: 'email',
    provider: provider,
    mockMode,
    async send(context, notification) {
      if (mockMode) {
        return provider.send(notification)
      }
      return provider.send(notification)
    },
    supports(channel) {
      return channel === 'email'
    },
    health() {
      return provider.health()
    }
  }
}

export function createAdapterHealthReport(adapters) {
  const report = {
    email: adapters.email?.health() || { status: 'unknown' },
    timestamp: new Date().toISOString()
  }
  return report
}

export default {
  createProductionAdapterSet,
  createAdapterHealthReport
}
