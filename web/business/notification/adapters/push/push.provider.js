/**
 * PUSH-2 — Push Provider
 *
 * Web Push provider using web-push library.
 * Handles actual push notification delivery to subscribers.
 */

import webpush from 'web-push'

export const PUSH_PROVIDER_STATUS = Object.freeze({
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  DOWN: 'down',
  MOCK: 'mock'
})

let providerInstance = null

export function createPushProvider(options = {}) {
  if (providerInstance) {
    return providerInstance
  }

  const vapidPublicKey = options.vapidPublicKey || process.env.WEB_PUSH_VAPID_PUBLIC_KEY
  const vapidPrivateKey = options.vapidPrivateKey || process.env.WEB_PUSH_VAPID_PRIVATE_KEY
  const subject = options.subject || process.env.WEB_PUSH_SUBJECT || 'mailto:notifications@example.com'

  const isConfigured = Boolean(vapidPublicKey && vapidPrivateKey)

  if (isConfigured) {
    webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey)
  }

  const provider = {
    status: isConfigured ? PUSH_PROVIDER_STATUS.HEALTHY : PUSH_PROVIDER_STATUS.MOCK,

    async send(subscription, payload) {
      if (!isConfigured) {
        return {
          success: true,
          status: 'mock',
          messageId: 'mock_' + Date.now(),
          mock: true
        }
      }

      try {
        const result = await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          JSON.stringify(payload)
        )

        return {
          success: true,
          status: result?.statusCode || 201,
          messageId: result?.body?.messageId || result?.headers?.['x-message-id'] || null
        }
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          return {
            success: false,
            status: error.statusCode,
            expired: true,
            permanent: error.statusCode === 410,
            error: 'Subscription expired or invalid'
          }
        }

        if (error.statusCode === 400) {
          return {
            success: false,
            status: 400,
            permanent: true,
            error: 'Invalid subscription'
          }
        }

        let sanitizedBody = null
        if (error.body) {
          const bodyStr = typeof error.body === 'string' ? error.body : JSON.stringify(error.body)
          sanitizedBody = bodyStr
            .replace(/https?:\/\/[^\s"']+/g, '[ENDPOINT_REDACTED]')
            .replace(/p256dh[^,}\]]*/gi, 'p256dh=[REDACTED]')
            .replace(/auth[^,}\]]*/gi, 'auth=[REDACTED]')
            .substring(0, 500)
        }
        console.error(`[PUSH-PROVIDER] delivery failed statusCode=${error.statusCode || null} name=${error.name || null} message=${(error.message || '').replace(/https?:\/\/[^\s"']+/g, '[URL_REDACTED]').substring(0, 200)} body=${sanitizedBody || null}`)
        return {
          success: false,
          status: error.statusCode || 500,
          error: error.message
        }
      }
    },

    health() {
      return {
        status: this.status,
        configured: isConfigured,
        provider: 'web-push'
      }
    },

    isConfigured() {
      return isConfigured
    },

    getPublicKey() {
      return vapidPublicKey || null
    }
  }

  providerInstance = provider
  return provider
}

export class MockWebPushProvider {
  constructor(options = {}) {
    this.status = PUSH_PROVIDER_STATUS.MOCK
    this.#deliveries = []
    this.#shouldFail = options.shouldFail || false
    this.#failureRate = options.failureRate || 0
  }

  #deliveries
  #shouldFail
  #failureRate

  async send(subscription, payload) {
    const delivery = {
      endpoint: subscription.endpoint,
      payload,
      timestamp: new Date().toISOString(),
      success: !this.#shouldFail && Math.random() > this.#failureRate
    }

    this.#deliveries.push(delivery)

    if (delivery.success) {
      return {
        success: true,
        status: 'mock',
        messageId: 'mock_push_' + Date.now()
      }
    }

    return {
      success: false,
      status: 'mock_failed',
      error: 'Mock delivery failed'
    }
  }

  getDeliveries() {
    return [...this.#deliveries]
  }

  clearDeliveries() {
    this.#deliveries = []
  }

  health() {
    return {
      status: PUSH_PROVIDER_STATUS.MOCK,
      configured: true,
      provider: 'MockWebPushProvider'
    }
  }
}

export default {
  createPushProvider,
  MockWebPushProvider,
  PUSH_PROVIDER_STATUS
}
