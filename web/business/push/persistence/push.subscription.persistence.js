/**
 * PUSH-1 — Push Subscription Persistence
 *
 * File-based persistence for push subscriptions.
 * Maintains Application-scoped + Environment-scoped isolation for all subscriber data.
 *
 * Storage Structure:
 *   data/push/
 *   └── {environment}/
 *       └── {applicationId}/
 *           └── subscriptions/
 *               ├── index.json (subscription index)
 *               └── {subscriptionId}.json (individual subscription)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PushSubscription, PUSH_ENVIRONMENTS } from '../push.subscription.model.js'
import { generateSubscriptionHash } from '../push.subscription.model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class PushSubscriptionPersistence {
  #basePath
  #subscriptions
  #endpointIndex

  constructor(options = {}) {
    this.#basePath = options.basePath || this.#getDefaultBasePath()
    this.#subscriptions = new Map()
    this.#endpointIndex = new Map()
  }

  #getDefaultBasePath() {
    return join(__dirname, '..', '..', '..', 'data', 'push')
  }

  #getSubscriptionDir(environment, applicationId) {
    return join(this.#basePath, environment, applicationId.replace('/', '_'), 'subscriptions')
  }

  #ensureDir(dir) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  #getIndexPath(environment, applicationId) {
    return join(this.#getSubscriptionDir(environment, applicationId), 'index.json')
  }

  #getSubscriptionPath(environment, applicationId, subscriptionId) {
    return join(this.#getSubscriptionDir(environment, applicationId), `${subscriptionId}.json`)
  }

  async create(subscription) {
    const environment = subscription.environment
    const applicationId = subscription.applicationId
    const dir = this.#getSubscriptionDir(environment, applicationId)
    this.#ensureDir(dir)

    const subPath = this.#getSubscriptionPath(environment, applicationId, subscription.id)
    writeFileSync(subPath, JSON.stringify(subscription.toJSON(), null, 2))

    const indexPath = this.#getIndexPath(environment, applicationId)
    let index = this.#loadIndex(environment, applicationId)
    index[subscription.id] = {
      endpoint: subscription.endpoint,
      status: subscription.status,
      createdAt: subscription.createdAt
    }
    writeFileSync(indexPath, JSON.stringify(index, null, 2))

    const hash = generateSubscriptionHash(subscription.endpoint, applicationId, environment)
    this.#endpointIndex.set(hash, subscription.id)

    this.#subscriptions.set(subscription.id, subscription)

    return subscription
  }

  async update(subscription) {
    const environment = subscription.environment
    const subPath = this.#getSubscriptionPath(environment, subscription.applicationId, subscription.id)
    writeFileSync(subPath, JSON.stringify(subscription.toJSON(), null, 2))

    const indexPath = this.#getIndexPath(environment, subscription.applicationId)
    let index = this.#loadIndex(environment, subscription.applicationId)
    if (index[subscription.id]) {
      index[subscription.id].status = subscription.status
      index[subscription.id].updatedAt = subscription.updatedAt
      if (subscription.revokedAt) {
        index[subscription.id].revokedAt = subscription.revokedAt
      }
      writeFileSync(indexPath, JSON.stringify(index, null, 2))
    }

    this.#subscriptions.set(subscription.id, subscription)

    return subscription
  }

  async get(subscriptionId) {
    if (this.#subscriptions.has(subscriptionId)) {
      return this.#subscriptions.get(subscriptionId)
    }
    return null
  }

  async getById(environment, applicationId, subscriptionId) {
    const subPath = this.#getSubscriptionPath(environment, applicationId, subscriptionId)
    if (existsSync(subPath)) {
      const data = JSON.parse(readFileSync(subPath, 'utf-8'))
      const subscription = PushSubscription.fromLegacyJSON(data)
      this.#subscriptions.set(subscriptionId, subscription)
      return subscription
    }
    return null
  }

  async findByEndpoint(environment, applicationId, endpoint) {
    const hash = generateSubscriptionHash(endpoint, applicationId, environment)

    if (this.#endpointIndex.has(hash)) {
      const subscriptionId = this.#endpointIndex.get(hash)
      return this.getById(environment, applicationId, subscriptionId)
    }

    const index = this.#loadIndex(environment, applicationId)
    for (const [subId, meta] of Object.entries(index)) {
      if (meta.endpoint === endpoint) {
        this.#endpointIndex.set(hash, subId)
        const subPath = this.#getSubscriptionPath(environment, applicationId, subId)
        if (existsSync(subPath)) {
          const data = JSON.parse(readFileSync(subPath, 'utf-8'))
          const subscription = PushSubscription.fromLegacyJSON(data)
          this.#subscriptions.set(subId, subscription)
          return subscription
        }
      }
    }

    return null
  }

  async listActive(environment, applicationId) {
    const index = this.#loadIndex(environment, applicationId)
    const active = []

    for (const [subId, meta] of Object.entries(index)) {
      if (meta.status === 'active') {
        const subPath = this.#getSubscriptionPath(environment, applicationId, subId)
        if (existsSync(subPath)) {
          const data = JSON.parse(readFileSync(subPath, 'utf-8'))
          const subscription = PushSubscription.fromLegacyJSON(data)
          this.#subscriptions.set(subId, subscription)
          active.push(subscription.toJSON())
        }
      }
    }

    return active
  }

  async countActive(environment, applicationId) {
    const index = this.#loadIndex(environment, applicationId)
    let count = 0

    for (const [, meta] of Object.entries(index)) {
      if (meta.status === 'active') {
        count++
      }
    }

    return count
  }

  async countRevoked(environment, applicationId) {
    const index = this.#loadIndex(environment, applicationId)
    let count = 0

    for (const [, meta] of Object.entries(index)) {
      if (meta.status === 'revoked') {
        count++
      }
    }

    return count
  }

  async listAll(environment, applicationId) {
    const index = this.#loadIndex(environment, applicationId)
    const all = []

    for (const subId of Object.keys(index)) {
      const subPath = this.#getSubscriptionPath(environment, applicationId, subId)
      if (existsSync(subPath)) {
        const data = JSON.parse(readFileSync(subPath, 'utf-8'))
        const subscription = PushSubscription.fromLegacyJSON(data)
        this.#subscriptions.set(subId, subscription)
        all.push(subscription.toSafeJSON())
      }
    }

    return all
  }

  #loadIndex(environment, applicationId) {
    const indexPath = this.#getIndexPath(environment, applicationId)
    if (!existsSync(indexPath)) {
      return {}
    }
    try {
      return JSON.parse(readFileSync(indexPath, 'utf-8'))
    } catch {
      return {}
    }
  }
}

export function createPushSubscriptionPersistence(options = {}) {
  return new PushSubscriptionPersistence(options)
}

export default {
  PushSubscriptionPersistence,
  createPushSubscriptionPersistence
}
