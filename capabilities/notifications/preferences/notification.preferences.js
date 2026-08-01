/**
 * Notifications Capability — Preferences Manager
 *
 * Manages per-user and per-tenant notification preferences
 * Business-agnostic: users choose what they receive and how
 */
import { NOTIFICATION_EVENTS } from '../notification.events.js'
import { NOTIFICATION_CHANNELS } from '../notification.schema.js'

const DEFAULT_PREFERENCES = [
  { channel: NOTIFICATION_CHANNELS.EMAIL, category: 'reservation', enabled: true, frequency: 'immediate' },
  { channel: NOTIFICATION_CHANNELS.EMAIL, category: 'billing', enabled: true, frequency: 'immediate' },
  { channel: NOTIFICATION_CHANNELS.EMAIL, category: 'onboarding', enabled: true, frequency: 'immediate' },
  { channel: NOTIFICATION_CHANNELS.EMAIL, category: 'marketing', enabled: true, frequency: 'weekly' },
  { channel: NOTIFICATION_CHANNELS.PUSH, category: 'reservation', enabled: true, frequency: 'immediate' },
  { channel: NOTIFICATION_CHANNELS.PUSH, category: 'billing', enabled: false, frequency: 'immediate' },
  { channel: NOTIFICATION_CHANNELS.PUSH, category: 'marketing', enabled: false, frequency: 'immediate' },
  { channel: NOTIFICATION_CHANNELS.SMS, category: 'reservation', enabled: true, frequency: 'immediate' },
  { channel: NOTIFICATION_CHANNELS.SMS, category: 'auth', enabled: true, frequency: 'immediate' },
  { channel: NOTIFICATION_CHANNELS.WHATSAPP, category: 'reservation', enabled: true, frequency: 'immediate' },
]

export class NotificationPreferences {
  #preferences = new Map()
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
  }

  #getKey(tenantId, userId, channel, category) {
    return `${tenantId}:${userId || 'global'}:${channel}:${category}`
  }

  /**
   * Get preferences for a user
   * @param {string} tenantId
   * @param {string} [userId]
   * @returns {object[]}
   */
  get(tenantId, userId) {
    const prefs = []
    for (const [key, pref] of this.#preferences) {
      if (key.startsWith(`${tenantId}:`) && (!userId || key.includes(`:${userId}:`))) {
        prefs.push({ ...pref })
      }
    }
    return prefs
  }

  /**
   * Get preference for a specific channel + category
   * @param {string} tenantId
   * @param {string} channel
   * @param {string} category
   * @param {string} [userId]
   * @returns {object|null}
   */
  getOne(tenantId, channel, category, userId) {
    const key = this.#getKey(tenantId, userId, channel, category)
    const pref = this.#preferences.get(key)
    if (pref) return { ...pref }

    // Fallback to global
    const globalKey = this.#getKey(tenantId, null, channel, category)
    return this.#preferences.get(globalKey) || null
  }

  /**
   * Set a preference
   * @param {string} tenantId
   * @param {string} channel
   * @param {string} category
   * @param {object} prefs - { enabled, frequency, quietHoursStart, quietHoursEnd, timezone }
   * @param {string} [userId]
   * @returns {{ success: boolean, preference?: object }}
   */
  set(tenantId, channel, category, prefs, userId) {
    const key = this.#getKey(tenantId, userId, channel, category)

    const entry = {
      tenantId,
      userId: userId || null,
      channel,
      category,
      enabled: prefs.enabled !== false,
      frequency: prefs.frequency || 'immediate',
      quietHoursStart: prefs.quietHoursStart || null,
      quietHoursEnd: prefs.quietHoursEnd || null,
      timezone: prefs.timezone || 'UTC',
      createdAt: this.#preferences.get(key)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.#preferences.set(key, entry)
    this.#eventBus?.emit(NOTIFICATION_EVENTS.PREFERENCE_UPDATED, { preference: entry })
    return { success: true, preference: entry }
  }

  /**
   * Check if a notification should be sent based on preferences
   * @param {string} tenantId
   * @param {string} channel
   * @param {string} category
   * @param {string} [userId]
   * @returns {{ allowed: boolean, reason?: string }}
   */
  isAllowed(tenantId, channel, category, userId) {
    const pref = this.getOne(tenantId, channel, category, userId)

    if (pref && !pref.enabled) {
      return { allowed: false, reason: 'disabled_by_user' }
    }

    if (pref && pref.quietHoursStart && pref.quietHoursEnd) {
      const now = new Date()
      const hour = now.getHours()
      const startHour = parseInt(pref.quietHoursStart.split(':')[0], 10)
      const endHour = parseInt(pref.quietHoursEnd.split(':')[0], 10)

      if (startHour > endHour) {
        // Spans midnight
        if (hour >= startHour || hour < endHour) {
          return { allowed: false, reason: 'quiet_hours' }
        }
      } else {
        if (hour >= startHour && hour < endHour) {
          return { allowed: false, reason: 'quiet_hours' }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Initialize default preferences for a tenant
   * @param {string} tenantId
   */
  initDefaults(tenantId) {
    for (const pref of DEFAULT_PREFERENCES) {
      const key = this.#getKey(tenantId, null, pref.channel, pref.category)
      if (!this.#preferences.has(key)) {
        this.#preferences.set(key, {
          tenantId,
          userId: null,
          ...pref,
          quietHoursStart: null,
          quietHoursEnd: null,
          timezone: 'UTC',
          createdAt: new Date().toISOString(),
          updatedAt: null,
        })
      }
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.#preferences.clear()
  }
}
