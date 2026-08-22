/**
 * PUSH-1 — Push Subscription Model
 *
 * Represents a server-side push subscription record.
 * Each subscription belongs to a canonical ApplicationIdentity.
 */

export const PUSH_SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired'
})

export class PushSubscription {
  #id
  #applicationId
  #endpoint
  #keys
  #status
  #createdAt
  #updatedAt
  #revokedAt

  constructor(data = {}) {
    this.#id = data.id || this.#generateId()
    this.#applicationId = data.applicationId || null
    this.#endpoint = data.endpoint || null
    this.#keys = data.keys || null
    this.#status = data.status || PUSH_SUBSCRIPTION_STATUS.ACTIVE
    this.#createdAt = data.createdAt || new Date().toISOString()
    this.#updatedAt = data.updatedAt || new Date().toISOString()
    this.#revokedAt = data.revokedAt || null
  }

  #generateId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `push_${timestamp}${random}`
  }

  get id() {
    return this.#id
  }

  get applicationId() {
    return this.#applicationId
  }

  get endpoint() {
    return this.#endpoint
  }

  get keys() {
    return this.#keys ? { ...this.#keys } : null
  }

  get status() {
    return this.#status
  }

  get createdAt() {
    return this.#createdAt
  }

  get updatedAt() {
    return this.#updatedAt
  }

  get revokedAt() {
    return this.#revokedAt
  }

  get isActive() {
    return this.#status === PUSH_SUBSCRIPTION_STATUS.ACTIVE
  }

  get isRevoked() {
    return this.#status === PUSH_SUBSCRIPTION_STATUS.REVOKED
  }

  revoke() {
    if (this.#status !== PUSH_SUBSCRIPTION_STATUS.ACTIVE) {
      return false
    }
    this.#status = PUSH_SUBSCRIPTION_STATUS.REVOKED
    this.#revokedAt = new Date().toISOString()
    this.#updatedAt = new Date().toISOString()
    return true
  }

  toJSON() {
    return {
      id: this.#id,
      applicationId: this.#applicationId,
      endpoint: this.#endpoint,
      keys: this.#keys ? { ...this.#keys } : null,
      status: this.#status,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
      revokedAt: this.#revokedAt
    }
  }

  toSafeJSON() {
    return {
      id: this.#id,
      applicationId: this.#applicationId,
      status: this.#status,
      createdAt: this.#createdAt,
      revokedAt: this.#revokedAt
    }
  }

  freeze() {
    return Object.freeze(this.toJSON())
  }

  static fromJSON(json) {
    return new PushSubscription(json)
  }

  static getStatuses() {
    return { ...PUSH_SUBSCRIPTION_STATUS }
  }

  static isValidStatus(status) {
    return Object.values(PUSH_SUBSCRIPTION_STATUS).includes(status)
  }
}

export function createPushSubscription(data = {}) {
  return new PushSubscription(data)
}

export function generateSubscriptionHash(endpoint, applicationId) {
  let hash = 0
  const str = `${applicationId}:${endpoint}`
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export default {
  PushSubscription,
  createPushSubscription,
  generateSubscriptionHash,
  PUSH_SUBSCRIPTION_STATUS
}
