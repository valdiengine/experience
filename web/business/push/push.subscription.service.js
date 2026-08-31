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
  PUSH_SUBSCRIPTION_STATUS,
  PUSH_ENVIRONMENTS
} from './push.subscription.model.js'

export function resolveDeploymentEnvironment() {
  const env = process.env.TURISTIC_ENV
  if (env === 'staging') return 'staging'
  if (env === 'production') return 'production'
  throw new Error('DEPLOYMENT_ENVIRONMENT_INVALID: TURISTIC_ENV must be "staging" or "production", got: ' + (env || '(undefined)'))
}

export const PUSH_VALIDATION_ERRORS = Object.freeze({
  MISSING_ENVIRONMENT: 'environment is required and must be staging or production',
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

  async register(environment, applicationId, subscriptionData) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      return { success: false, error: PUSH_VALIDATION_ERRORS.MISSING_ENVIRONMENT }
    }

    const validation = this.#validateSubscriptionData(subscriptionData)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    if (!applicationId) {
      return { success: false, error: PUSH_VALIDATION_ERRORS.MISSING_APPLICATION_ID }
    }

    const endpoint = subscriptionData.endpoint
    const keys = subscriptionData.keys

    const existing = await this.#persistence.findByEndpoint(environment, applicationId, endpoint)
    if (existing) {
      if (existing.status === PUSH_SUBSCRIPTION_STATUS.REVOKED) {
        existing.reactivate()
        await this.#persistence.update(existing)
        return { success: true, subscription: existing.toSafeJSON(), isReactivated: true }
      }
      return { success: true, subscription: existing.toSafeJSON(), isDuplicate: true }
    }

    const subscription = createPushSubscription({
      applicationId,
      environment,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth }
    })

    await this.#persistence.create(subscription)

    return { success: true, subscription: subscription.toSafeJSON() }
  }

  async revoke(environment, applicationId, subscriptionId) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      return { success: false, error: PUSH_VALIDATION_ERRORS.MISSING_ENVIRONMENT }
    }

    const subscription = await this.#persistence.getById(environment, applicationId, subscriptionId)
    if (!subscription) {
      return { success: false, error: 'Subscription not found' }
    }

    if (subscription.applicationId !== applicationId || subscription.environment !== environment) {
      return { success: false, error: 'Subscription does not belong to this application' }
    }

    if (!subscription.isActive) {
      return { success: false, error: 'Subscription is not active' }
    }

    subscription.revoke()
    await this.#persistence.update(subscription)

    return { success: true }
  }

  async revokeByEndpoint(environment, applicationId, endpoint) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      return { success: false, error: PUSH_VALIDATION_ERRORS.MISSING_ENVIRONMENT }
    }

    const subscription = await this.#persistence.findByEndpoint(environment, applicationId, endpoint)
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

  async getStatus(environment, applicationId) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      return { success: false, error: PUSH_VALIDATION_ERRORS.MISSING_ENVIRONMENT }
    }

    const active = await this.#persistence.countActive(environment, applicationId)
    const revoked = await this.#persistence.countRevoked(environment, applicationId)

    return {
      success: true,
      applicationId,
      environment,
      active,
      revoked,
      total: active + revoked
    }
  }

  async getActiveSubscriptions(environment, applicationId) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      return []
    }

    return this.#persistence.listActive(environment, applicationId)
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
