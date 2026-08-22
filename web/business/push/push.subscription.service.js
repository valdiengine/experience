/**
 * PUSH-1 — Push Subscription Service
 *
 * Handles push subscription registration, validation, and management.
 * Uses Application-scoped persistence for subscriber isolation.
 */

import {
  PushSubscription,
  createPushSubscription,
  generateSubscriptionHash,
  PUSH_SUBSCRIPTION_STATUS
} from './push.subscription.model.js'

export const PUSH_VALIDATION_ERRORS = Object.freeze({
  MISSING_APPLICATION_ID: 'applicationId is required',
  INVALID_APPLICATION_ID: 'Invalid applicationId format',
  MISSING_ENDPOINT: 'endpoint is required',
  INVALID_ENDPOINT: 'endpoint must be a valid URL',
  MISSING_P256DH: 'keys.p256dh is required',
  MISSING_AUTH: 'keys.auth is required',
  INVALID_KEYS: 'keys must be an object with p256dh and auth',
  ENDPOINT_TOO_LONG: 'endpoint exceeds maximum length',
  PAYLOAD_TOO_LARGE: 'subscription payload too large',
  UNEXPECTED_FIELD: 'unexpected field in subscription',
  APPLICATION_NOT_FOUND: 'application not found',
  PUSH_NOT_ENABLED: 'pushNotifications capability not enabled for this application'
})

export class PushSubscriptionService {
  #persistence
  #options

  constructor(options = {}) {
    this.#persistence = options.persistence
    this.#options = {
      maxEndpointLength: options.maxEndpointLength || 8192,
      ...options
    }
  }

  setPersistence(persistence) {
    this.#persistence = persistence
  }

  async register(applicationId, subscriptionData) {
    const validation = this.#validateSubscriptionData(subscriptionData)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    if (!applicationId) {
      return { success: false, error: PUSH_VALIDATION_ERRORS.MISSING_APPLICATION_ID }
    }

    const endpoint = subscriptionData.endpoint
    const keys = subscriptionData.keys

    const existing = await this.#persistence.findByEndpoint(applicationId, endpoint)
    if (existing) {
      if (existing.status === PUSH_SUBSCRIPTION_STATUS.REVOKED) {
        existing.revoke()
        await this.#persistence.update(existing)
        return { success: true, subscription: existing.toSafeJSON(), isReactivated: true }
      }
      return { success: true, subscription: existing.toSafeJSON(), isDuplicate: true }
    }

    const subscription = createPushSubscription({
      applicationId,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth }
    })

    await this.#persistence.create(subscription)

    return { success: true, subscription: subscription.toSafeJSON() }
  }

  async revoke(applicationId, subscriptionId) {
    const subscription = await this.#persistence.get(subscriptionId)
    if (!subscription) {
      return { success: false, error: 'Subscription not found' }
    }

    if (subscription.applicationId !== applicationId) {
      return { success: false, error: 'Subscription does not belong to this application' }
    }

    if (!subscription.isActive) {
      return { success: false, error: 'Subscription is not active' }
    }

    subscription.revoke()
    await this.#persistence.update(subscription)

    return { success: true }
  }

  async revokeByEndpoint(applicationId, endpoint) {
    const subscription = await this.#persistence.findByEndpoint(applicationId, endpoint)
    if (!subscription) {
      return { success: false, error: 'Subscription not found' }
    }

    if (subscription.applicationId !== applicationId) {
      return { success: false, error: 'Subscription does not belong to this application' }
    }

    if (!subscription.isActive) {
      return { success: true }
    }

    subscription.revoke()
    await this.#persistence.update(subscription)

    return { success: true }
  }

  async getStatus(applicationId) {
    const active = await this.#persistence.countActive(applicationId)
    const revoked = await this.#persistence.countRevoked(applicationId)

    return {
      applicationId,
      active,
      revoked,
      total: active + revoked
    }
  }

  async getActiveSubscriptions(applicationId) {
    return this.#persistence.listActive(applicationId)
  }

  #validateSubscriptionData(data) {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Subscription data must be an object' }
    }

    if (!data.endpoint) {
      return { valid: false, error: PUSH_VALIDATION_ERRORS.MISSING_ENDPOINT }
    }

    if (typeof data.endpoint !== 'string') {
      return { valid: false, error: PUSH_VALIDATION_ERRORS.INVALID_ENDPOINT }
    }

    if (data.endpoint.length > this.#options.maxEndpointLength) {
      return { valid: false, error: PUSH_VALIDATION_ERRORS.ENDPOINT_TOO_LONG }
    }

    try {
      new URL(data.endpoint)
    } catch {
      return { valid: false, error: PUSH_VALIDATION_ERRORS.INVALID_ENDPOINT }
    }

    if (!data.keys || typeof data.keys !== 'object') {
      return { valid: false, error: PUSH_VALIDATION_ERRORS.INVALID_KEYS }
    }

    if (!data.keys.p256dh || typeof data.keys.p256dh !== 'string') {
      return { valid: false, error: PUSH_VALIDATION_ERRORS.MISSING_P256DH }
    }

    if (!data.keys.auth || typeof data.keys.auth !== 'string') {
      return { valid: false, error: PUSH_VALIDATION_ERRORS.MISSING_AUTH }
    }

    const allowedKeys = ['endpoint', 'keys', 'expirationTime', 'p256dh', 'auth']
    const dataKeys = Object.keys(data)
    for (const key of dataKeys) {
      if (!allowedKeys.includes(key)) {
        return { valid: false, error: `${PUSH_VALIDATION_ERRORS.UNEXPECTED_FIELD}: ${key}` }
      }
    }

    return { valid: true }
  }
}

export function createPushSubscriptionService(options = {}) {
  return new PushSubscriptionService(options)
}

export default {
  PushSubscriptionService,
  createPushSubscriptionService,
  PUSH_VALIDATION_ERRORS
}
