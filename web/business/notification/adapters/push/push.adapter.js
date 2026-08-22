/**
 * PUSH-2 — Push Notification Adapter
 *
 * Handles Push notification delivery through Web Push protocol.
 * Integrates with existing Notification Core adapter pattern.
 */

import {
  NotificationAdapter
} from '../notification.adapter.js'

import {
  createPushProvider,
  MockWebPushProvider,
  PUSH_PROVIDER_STATUS
} from './push.provider.js'

import {
  createPushSubscriptionService
} from '../../../push/push.subscription.service.js'

import {
  createPushSubscriptionPersistence
} from '../../../push/persistence/push.subscription.persistence.js'

export const PUSH_ADAPTER_ERRORS = Object.freeze({
  PROVIDER_UNAVAILABLE: 'Push provider unavailable',
  NO_SUBSCRIBERS: 'No active subscribers',
  INVALID_PAYLOAD: 'Invalid notification payload',
  DELIVERY_FAILED: 'Push delivery failed'
})

export class PushNotificationAdapter extends NotificationAdapter {
  constructor(options = {}) {
    super('push')

    this.#provider = options.provider || createPushProvider({
      vapidPublicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY,
      subject: process.env.WEB_PUSH_SUBJECT
    })

    this.#persistence = options.persistence || createPushSubscriptionPersistence()
    this.#subscriptionService = createPushSubscriptionService({ persistence: this.#persistence })
    this.#mockMode = options.mockMode !== false
    this.#deliveries = []
  }

  #provider
  #persistence
  #subscriptionService
  #mockMode
  #deliveries

  async send(context, notification) {
    const applicationId = notification.applicationId

    if (!applicationId) {
      return {
        success: false,
        channel: 'push',
        notificationId: notification.id,
        error: 'applicationId required for push delivery'
      }
    }

    const activeSubscriptions = await this.#subscriptionService.getActiveSubscriptions(applicationId)

    if (activeSubscriptions.length === 0) {
      return {
        success: true,
        channel: 'push',
        notificationId: notification.id,
        status: 'no_subscribers',
        message: 'No active subscribers for this application'
      }
    }

    const payload = this.#buildPayload(notification)

    const results = {
      attempted: activeSubscriptions.length,
      sent: 0,
      failed: 0,
      expired: 0
    }

    for (const subscription of activeSubscriptions) {
      const result = await this.#deliverToSubscription(subscription, payload, notification.id)

      if (result.success) {
        results.sent++
      } else if (result.expired || result.status === 'expired') {
        results.expired++
        await this.#markSubscriptionExpired(subscription.id, applicationId)
      } else {
        results.failed++
      }
    }

    return {
      success: results.failed === 0,
      channel: 'push',
      notificationId: notification.id,
      applicationId,
      ...results
    }
  }

  async #deliverToSubscription(subscription, payload, notificationId) {
    try {
      const subWithKeys = {
        id: subscription.id,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys?.p256dh || subscription.p256dh,
          auth: subscription.keys?.auth || subscription.auth
        }
      }

      const result = await this.#provider.send(subWithKeys, payload)

      const deliveryRecord = {
        notificationId,
        subscriptionId: subscription.id,
        applicationId: subscription.applicationId,
        endpoint: subscription.endpoint,
        status: result.success ? 'delivered' : 'failed',
        providerStatus: result.status,
        timestamp: new Date().toISOString(),
        mock: result.mock || false
      }

      this.#deliveries.push(deliveryRecord)

      return result
    } catch (error) {
      return {
        success: false,
        status: 'error',
        error: error.message
      }
    }
  }

  #buildPayload(notification) {
    return {
      title: notification.payload?.title || notification.payload?.headline || 'Notificación',
      body: notification.payload?.body || notification.payload?.message || '',
      icon: notification.payload?.icon || '/icons/notification-icon.png',
      badge: notification.payload?.badge || '/icons/badge-icon.png',
      tag: `notif-${notification.id}`,
      url: this.#buildTargetUrl(notification),
      notificationId: notification.id,
      applicationId: notification.applicationId,
      timestamp: new Date().toISOString()
    }
  }

  #buildTargetUrl(notification) {
    const basePaths = {
      'valdi.app': '/albasie',
      'natales.app': '/turismo-21',
      'puntaarenas.app': '/hostal-del-tuto',
      'coyhaique.app': '/dronestica',
      'chiloe.app': '/el-encanto-chiloe'
    }

    const domain = notification.domain || notification.applicationId?.split('/')[0] || ''
    const basePath = basePaths[domain] || '/'

    if (notification.payload?.url) {
      const url = notification.payload.url
      if (url.startsWith('http') || url.startsWith('/')) {
        return url
      }
    }

    return basePath
  }

  async #markSubscriptionExpired(subscriptionId, applicationId) {
    try {
      const subscription = await this.#persistence.get(subscriptionId)
      if (subscription && subscription.applicationId === applicationId) {
        subscription.revoke()
        await this.#persistence.update(subscription)
      }
    } catch (error) {
      console.warn('[PushNotificationAdapter] Failed to mark subscription expired:', error.message)
    }
  }

  supports(channel) {
    return channel === 'push'
  }

  health() {
    return {
      status: this.#provider?.status || 'unknown',
      channel: 'push',
      provider: this.#provider?.constructor?.name || 'Unknown',
      deliveriesCount: this.#deliveries.length
    }
  }

  getDeliveries() {
    return [...this.#deliveries]
  }

  clearDeliveries() {
    this.#deliveries = []
  }

  getProvider() {
    return this.#provider
  }
}

export function createPushNotificationAdapter(options = {}) {
  return new PushNotificationAdapter(options)
}

export default {
  PushNotificationAdapter,
  createPushNotificationAdapter,
  PUSH_ADAPTER_ERRORS
}
