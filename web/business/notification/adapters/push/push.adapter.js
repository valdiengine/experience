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
  createPushSubscriptionService,
  resolveDeploymentEnvironment
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

  #getEnvironment() {
    return resolveDeploymentEnvironment()
  }

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

    const environment = this.#getEnvironment()
    const activeSubscriptions = await this.#subscriptionService.getActiveSubscriptions(environment, applicationId)

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
        await this.#markSubscriptionExpired(subscription, applicationId)
      } else {
        results.failed++
      }
    }

    if (results.failed > 0 || results.sent > 0) {
      console.error(`[PUSH-DELIVERY] delivery aggregated attempted=${results.attempted} sent=${results.sent} failed=${results.failed} expired=${results.expired} notificationId=${notification.id} applicationId=${applicationId}`)
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
      if (!subscription.endpoint) {
        return { success: false, status: 'error', error: 'Missing endpoint' }
      }
      const p256dh = subscription.keys?.p256dh || subscription.p256dh
      const auth = subscription.keys?.auth || subscription.auth
      if (!p256dh || !auth) {
        return { success: false, status: 'error', error: 'Missing keys' }
      }

      const subWithKeys = {
        id: subscription.id,
        endpoint: subscription.endpoint,
        keys: { p256dh, auth }
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

  async #markSubscriptionExpired(subscription, applicationId) {
    try {
      const environment = subscription.environment || this.#getEnvironment()
      await this.#subscriptionService.revoke(environment, applicationId, subscription.id)
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
