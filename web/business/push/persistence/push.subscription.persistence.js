/**
 * PUSH-1 — Push Subscription Persistence
 *
 * File-based persistence for push subscriptions.
 * Maintains Application-scoped isolation for all subscriber data.
 *
 * Storage Structure:
 *   data/push/
 *   └── {applicationId}/
 *       └── subscriptions/
 *           ├── index.json (subscription index)
 *           └── {subscriptionId}.json (individual subscription)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PushSubscription } from '../push.subscription.model.js'
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

  #getSubscriptionDir(applicationId) {
    return join(this.#basePath, applicationId.replace('/', '_'), 'subscriptions')
  }

  #ensureDir(dir) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  #getIndexPath(applicationId) {
    return join(this.#getSubscriptionDir(applicationId), 'index.json')
  }

  #getSubscriptionPath(applicationId, subscriptionId) {
    return join(this.#getSubscriptionDir(applicationId), `${subscriptionId}.json`)
  }

  async create(subscription) {
    const dir = this.#getSubscriptionDir(subscription.applicationId)
    this.#ensureDir(dir)

    const subPath = this.#getSubscriptionPath(subscription.applicationId, subscription.id)
    writeFileSync(subPath, JSON.stringify(subscription.toJSON(), null, 2))

    const indexPath = this.#getIndexPath(subscription.applicationId)
    let index = this.#loadIndex(subscription.applicationId)
    index[subscription.id] = {
      endpoint: subscription.endpoint,
      status: subscription.status,
      createdAt: subscription.createdAt
    }
    writeFileSync(indexPath, JSON.stringify(index, null, 2))

    const hash = generateSubscriptionHash(subscription.endpoint, subscription.applicationId)
    this.#endpointIndex.set(hash, subscription.id)

    this.#subscriptions.set(subscription.id, subscription)

    return subscription
  }

  async update(subscription) {
    const subPath = this.#getSubscriptionPath(subscription.applicationId, subscription.id)
    writeFileSync(subPath, JSON.stringify(subscription.toJSON(), null, 2))

    const indexPath = this.#getIndexPath(subscription.applicationId)
    let index = this.#loadIndex(subscription.applicationId)
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

    for (const [appId] of this.#subscriptions) {
      const subPath = this.#getSubscriptionPath(appId, subscriptionId)
      if (existsSync(subPath)) {
        const data = JSON.parse(readFileSync(subPath, 'utf-8'))
        const subscription = PushSubscription.fromJSON(data)
        this.#subscriptions.set(subscriptionId, subscription)
        return subscription
      }
    }

    const index = this.#loadAllIndexes()
    for (const [appId, indexData] of Object.entries(index)) {
      if (indexData[subscriptionId]) {
        const subPath = this.#getSubscriptionPath(appId, subscriptionId)
        if (existsSync(subPath)) {
          const data = JSON.parse(readFileSync(subPath, 'utf-8'))
          const subscription = PushSubscription.fromJSON(data)
          this.#subscriptions.set(subscriptionId, subscription)
          return subscription
        }
      }
    }

    return null
  }

  #loadAllIndexes() {
    const indexes = {}
    if (!existsSync(this.#basePath)) {
      return indexes
    }
    const entries = readdirSync(this.#basePath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const indexPath = join(this.#basePath, entry.name, 'subscriptions', 'index.json')
        if (existsSync(indexPath)) {
          try {
            indexes[entry.name] = JSON.parse(readFileSync(indexPath, 'utf-8'))
          } catch {
            indexes[entry.name] = {}
          }
        }
      }
    }
    return indexes
  }

  async findByEndpoint(applicationId, endpoint) {
    const hash = generateSubscriptionHash(endpoint, applicationId)

    if (this.#endpointIndex.has(hash)) {
      const subscriptionId = this.#endpointIndex.get(hash)
      return this.get(subscriptionId)
    }

    const index = this.#loadIndex(applicationId)
    for (const [subId, meta] of Object.entries(index)) {
      if (meta.endpoint === endpoint) {
        this.#endpointIndex.set(hash, subId)
        return this.get(subId)
      }
    }

    return null
  }

  async listActive(applicationId) {
    const index = this.#loadIndex(applicationId)
    const active = []

    for (const [subId, meta] of Object.entries(index)) {
      if (meta.status === 'active') {
        const subscription = await this.get(subId)
        if (subscription) {
          active.push(subscription.toSafeJSON())
        }
      }
    }

    return active
  }

  async countActive(applicationId) {
    const index = this.#loadIndex(applicationId)
    let count = 0

    for (const [, meta] of Object.entries(index)) {
      if (meta.status === 'active') {
        count++
      }
    }

    return count
  }

  async countRevoked(applicationId) {
    const index = this.#loadIndex(applicationId)
    let count = 0

    for (const [, meta] of Object.entries(index)) {
      if (meta.status === 'revoked') {
        count++
      }
    }

    return count
  }

  async listAll(applicationId) {
    const index = this.#loadIndex(applicationId)
    const all = []

    for (const subId of Object.keys(index)) {
      const subscription = await this.get(subId)
      if (subscription) {
        all.push(subscription.toSafeJSON())
      }
    }

    return all
  }

  #loadIndex(applicationId) {
    const indexPath = this.#getIndexPath(applicationId)
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
