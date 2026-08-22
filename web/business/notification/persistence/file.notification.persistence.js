/**
 * P15.11.4 / MVP-PROD-1 — Notification Capability Core
 *
 * File-based notification persistence for production use.
 *
 * Storage structure:
 *   {basePath}/
 *   └── {domain}/
 *       └── {route-key}/
 *           └── notifications/
 *               ├── {notification-id}.json
 *               ├── by-interaction/
 *               │   └── {interaction-id}.json
 *               └── by-correlation/
 *                   └── {correlation-id}.json
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { NotificationPersistence } from './notification.persistence.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class FileNotificationPersistence extends NotificationPersistence {
  #basePath
  #fs
  #cache

  constructor(options = {}) {
    super()
    this.#basePath = options.basePath || this.#getDefaultBasePath()
    this.#fs = options.fs || { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync }
    this.#cache = new Map()
  }

  #getDefaultBasePath() {
    return join(__dirname, '..', '..', '..', '..', 'data', 'notifications')
  }

  #getNotificationDir(applicationId) {
    const parts = applicationId.split('/')
    const domain = parts[0] || 'unknown'
    const routeKey = parts.slice(1).join('/') || 'default'
    return join(this.#basePath, domain, routeKey, 'notifications')
  }

  #getNotificationPath(applicationId, notificationId) {
    return join(this.#getNotificationDir(applicationId), `${notificationId}.json`)
  }

  #getByInteractionDir(applicationId) {
    return join(this.#getNotificationDir(applicationId), 'by-interaction')
  }

  #getByInteractionPath(applicationId, interactionId) {
    return join(this.#getByInteractionDir(applicationId), `${interactionId}.json`)
  }

  #getByCorrelationDir(applicationId) {
    return join(this.#getNotificationDir(applicationId), 'by-correlation')
  }

  #getByCorrelationPath(applicationId, correlationId) {
    return join(this.#getByCorrelationDir(applicationId), `${correlationId}.json`)
  }

  #ensureDir(dir) {
    if (!this.#fs.existsSync(dir)) {
      this.#fs.mkdirSync(dir, { recursive: true })
    }
  }

  #readJson(path) {
    try {
      const content = this.#fs.readFileSync(path, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      return null
    }
  }

  #writeJson(path, data) {
    const dir = dirname(path)
    this.#ensureDir(dir)
    this.#fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
  }

  #findNotificationDirs() {
    const result = []

    const findDirs = (dir) => {
      if (!this.#fs.existsSync(dir)) return

      const entries = this.#fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = join(dir, entry.name)
          const notificationsDir = join(subDir, 'notifications')
          if (this.#fs.existsSync(notificationsDir)) {
            result.push(notificationsDir)
          }
          findDirs(subDir)
        }
      }
    }

    findDirs(this.#basePath)
    return result
  }

  create(notificationData) {
    const notification = {
      ...notificationData,
      createdAt: notificationData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (this.exists(notification.id)) {
      throw new Error(`Duplicate notification: ${notification.id}`)
    }

    const dir = this.#getNotificationDir(notification.applicationId)
    this.#ensureDir(dir)

    const notificationPath = this.#getNotificationPath(notification.applicationId, notification.id)
    this.#writeJson(notificationPath, notification)

    this.#cache.set(notification.id, notification)

    if (notification.sourceInteractionId) {
      this.#indexByInteraction(notification)
    }

    if (notification.correlationId) {
      this.#indexByCorrelation(notification)
    }

    return notification
  }

  #indexByInteraction(notification) {
    const dir = this.#getByInteractionDir(notification.applicationId)
    this.#ensureDir(dir)
    const indexPath = this.#getByInteractionPath(notification.applicationId, notification.sourceInteractionId)

    let index = []
    if (this.#fs.existsSync(indexPath)) {
      index = this.#readJson(indexPath) || []
    }

    if (!index.includes(notification.id)) {
      index.push(notification.id)
      this.#writeJson(indexPath, index)
    }
  }

  #indexByCorrelation(notification) {
    const dir = this.#getByCorrelationDir(notification.applicationId)
    this.#ensureDir(dir)
    const indexPath = this.#getByCorrelationPath(notification.applicationId, notification.correlationId)

    let index = []
    if (this.#fs.existsSync(indexPath)) {
      index = this.#readJson(indexPath) || []
    }

    if (!index.includes(notification.id)) {
      index.push(notification.id)
      this.#writeJson(indexPath, index)
    }
  }

  get(notificationId) {
    if (this.#cache.has(notificationId)) {
      return { ...this.#cache.get(notificationId) }
    }

    const dirs = this.#findNotificationDirs()
    for (const dir of dirs) {
      const notificationPath = join(dir, `${notificationId}.json`)
      if (this.#fs.existsSync(notificationPath)) {
        const notification = this.#readJson(notificationPath)
        if (notification) {
          this.#cache.set(notificationId, notification)
          return { ...notification }
        }
      }
    }

    return null
  }

  update(notificationId, updates) {
    const existing = this.get(notificationId)
    if (!existing) {
      return null
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    const notificationPath = this.#getNotificationPath(existing.applicationId, notificationId)
    this.#writeJson(notificationPath, updated)

    this.#cache.set(notificationId, updated)

    return { ...updated }
  }

  list(applicationId, filters = {}) {
    const dir = this.#getNotificationDir(applicationId)

    if (!this.#fs.existsSync(dir)) {
      return []
    }

    const files = this.#fs.readdirSync(dir)
    const notifications = []

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      const notificationPath = join(dir, file)
      const notification = this.#readJson(notificationPath)

      if (!notification) continue

      if (filters.type && notification.type !== filters.type) continue
      if (filters.status && notification.status !== filters.status) continue
      if (filters.environment && notification.environment !== filters.environment) continue
      if (filters.channel && notification.channels && !notification.channels.includes(filters.channel)) continue

      notifications.push(notification)
    }

    return notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }

  listByInteraction(sourceInteractionId, applicationId = null) {
    if (applicationId) {
      const indexPath = this.#getByInteractionPath(applicationId, sourceInteractionId)
      if (!this.#fs.existsSync(indexPath)) {
        return []
      }

      const index = this.#readJson(indexPath) || []
      return index.map(id => this.get(id)).filter(n => n !== null)
    }

    const dirs = this.#findNotificationDirs()
    const results = []

    for (const dir of dirs) {
      const indexPath = join(dir, 'by-interaction', `${sourceInteractionId}.json`)
      if (this.#fs.existsSync(indexPath)) {
        const index = this.#readJson(indexPath) || []
        for (const id of index) {
          const notification = this.get(id)
          if (notification) {
            results.push(notification)
          }
        }
      }
    }

    return results
  }

  listByCorrelationId(correlationId) {
    const dirs = this.#findNotificationDirs()
    const results = []

    for (const dir of dirs) {
      const indexPath = join(dir, 'by-correlation', `${correlationId}.json`)
      if (this.#fs.existsSync(indexPath)) {
        const index = this.#readJson(indexPath) || []
        for (const id of index) {
          const notification = this.get(id)
          if (notification) {
            results.push(notification)
          }
        }
      }
    }

    return results
  }

  exists(notificationId) {
    if (this.#cache.has(notificationId)) {
      return true
    }

    const dirs = this.#findNotificationDirs()
    for (const dir of dirs) {
      const notificationPath = join(dir, `${notificationId}.json`)
      if (this.#fs.existsSync(notificationPath)) {
        return true
      }
    }

    return false
  }

  markProcessing(notificationId) {
    return this.update(notificationId, { status: 'processing', updatedAt: new Date().toISOString() })
  }

  markDelivered(notificationId, channel = null) {
    const existing = this.get(notificationId)
    if (!existing) return null

    const updates = {
      status: 'delivered',
      updatedAt: new Date().toISOString()
    }

    if (channel) {
      updates.channelStatus = {
        ...existing.channelStatus,
        [channel]: {
          status: 'delivered',
          deliveredAt: new Date().toISOString()
        }
      }
    }

    return this.update(notificationId, updates)
  }

  markFailed(notificationId, channel = null, error = null) {
    const existing = this.get(notificationId)
    if (!existing) return null

    const attempts = (existing.attempts || 0) + 1

    const updates = {
      attempts,
      status: attempts >= (existing.maxAttempts || 3) ? 'failed' : 'pending',
      updatedAt: new Date().toISOString()
    }

    if (channel) {
      updates.channelStatus = {
        ...existing.channelStatus,
        [channel]: {
          status: 'failed',
          error,
          failedAt: new Date().toISOString()
        }
      }
    }

    if (error) {
      updates.lastError = error
    }

    return this.update(notificationId, updates)
  }

  markCancelled(notificationId) {
    return this.update(notificationId, { status: 'cancelled', updatedAt: new Date().toISOString() })
  }

  getStatistics(applicationId) {
    const notifications = this.list(applicationId)

    const stats = {
      total: notifications.length,
      byStatus: {},
      byType: {},
      byChannel: {},
      recent: []
    }

    for (const notification of notifications) {
      stats.byStatus[notification.status] = (stats.byStatus[notification.status] || 0) + 1
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1

      if (notification.channels) {
        for (const channel of notification.channels) {
          stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1
        }
      }
    }

    stats.recent = notifications.slice(0, 10).map(n => ({
      id: n.id,
      type: n.type,
      status: n.status,
      createdAt: n.createdAt
    }))

    return stats
  }
}

export function createFileNotificationPersistence(options = {}) {
  return new FileNotificationPersistence(options)
}

export default {
  FileNotificationPersistence,
  createFileNotificationPersistence
}
