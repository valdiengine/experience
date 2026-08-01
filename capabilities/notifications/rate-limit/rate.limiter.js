/**
 * Notifications Capability — Rate Limiter
 *
 * Prevents notification spam by limiting send rates per channel, per recipient, per tenant
 * Business-agnostic: rate limiting is purely operational
 */
import { NOTIFICATION_EVENTS } from '../notification.events.js'

const DEFAULT_LIMITS = {
  email: { perMinute: 10, perHour: 100, perDay: 500 },
  push: { perMinute: 5, perHour: 50, perDay: 200 },
  sms: { perMinute: 2, perHour: 10, perDay: 50 },
  whatsapp: { perMinute: 3, perHour: 30, perDay: 150 },
  in_app: { perMinute: 20, perHour: 200, perDay: 1000 },
}

export class RateLimiter {
  #windows = new Map()
  #limits = { ...DEFAULT_LIMITS }
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
  }

  /**
   * Set custom rate limits for a channel
   * @param {string} channel
   * @param {object} limits - { perMinute, perHour, perDay }
   */
  setLimits(channel, limits) {
    this.#limits[channel] = { ...this.#limits[channel], ...limits }
  }

  /**
   * Check if a notification is allowed
   * @param {string} channel
   * @param {string} recipient
   * @param {string} tenantId
   * @returns {{ allowed: boolean, reason?: string, retryAfterMs?: number }}
   */
  check(channel, recipient, tenantId) {
    const now = Date.now()
    const limits = this.#limits[channel] || DEFAULT_LIMITS.email

    const recipientKey = `recipient:${tenantId}:${channel}:${recipient}`
    const channelKey = `channel:${tenantId}:${channel}`
    const tenantKey = `tenant:${tenantId}`

    // Check per-recipient limit (per minute)
    const recipientCount = this.#countInWindow(recipientKey, now, 60000)
    if (recipientCount >= limits.perMinute) {
      const retryAfter = this.#getRetryAfter(recipientKey, now, 60000)
      this.#eventBus?.emit(NOTIFICATION_EVENTS.RATE_LIMITED, {
        channel,
        recipient,
        tenantId,
        limit: 'perMinute',
        count: recipientCount,
        max: limits.perMinute,
      })
      return { allowed: false, reason: 'recipient_per_minute_limit', retryAfterMs: retryAfter }
    }

    // Check per-channel limit (per hour)
    const channelCount = this.#countInWindow(channelKey, now, 3600000)
    if (channelCount >= limits.perHour) {
      const retryAfter = this.#getRetryAfter(channelKey, now, 3600000)
      this.#eventBus?.emit(NOTIFICATION_EVENTS.RATE_LIMITED, {
        channel,
        tenantId,
        limit: 'perHour',
        count: channelCount,
        max: limits.perHour,
      })
      return { allowed: false, reason: 'channel_per_hour_limit', retryAfterMs: retryAfter }
    }

    // Check tenant limit (per day)
    const tenantCount = this.#countInWindow(tenantKey, now, 86400000)
    if (tenantCount >= limits.perDay) {
      const retryAfter = this.#getRetryAfter(tenantKey, now, 86400000)
      this.#eventBus?.emit(NOTIFICATION_EVENTS.RATE_LIMITED, {
        channel,
        tenantId,
        limit: 'perDay',
        count: tenantCount,
        max: limits.perDay,
      })
      return { allowed: false, reason: 'tenant_per_day_limit', retryAfterMs: retryAfter }
    }

    // Record this send
    this.#record(recipientKey, now)
    this.#record(channelKey, now)
    this.#record(tenantKey, now)

    return { allowed: true }
  }

  /**
   * Get current usage stats for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getUsage(tenantId) {
    const now = Date.now()
    const usage = {}

    for (const channel of Object.keys(this.#limits)) {
      const channelKey = `channel:${tenantId}:${channel}`
      usage[channel] = {
        perMinute: this.#countInWindow(`${channelKey}:minute`, now, 60000),
        perHour: this.#countInWindow(channelKey, now, 3600000),
        perDay: this.#countInWindow(channelKey, now, 86400000),
        limits: this.#limits[channel],
      }
    }

    return usage
  }

  /**
   * Get rate limit status for a specific channel + recipient
   * @param {string} channel
   * @param {string} recipient
   * @param {string} tenantId
   * @returns {{ sent: number, limit: number, remaining: number, resetMs: number }}
   */
  getStatus(channel, recipient, tenantId) {
    const now = Date.now()
    const limits = this.#limits[channel] || DEFAULT_LIMITS.email
    const recipientKey = `recipient:${tenantId}:${channel}:${recipient}`

    const sent = this.#countInWindow(recipientKey, now, 60000)
    const remaining = Math.max(0, limits.perMinute - sent)
    const resetMs = this.#getRetryAfter(recipientKey, now, 60000)

    return { sent, limit: limits.perMinute, remaining, resetMs }
  }

  #countInWindow(key, now, windowMs) {
    const timestamps = this.#windows.get(key) || []
    const windowStart = now - windowMs
    return timestamps.filter(t => t > windowStart).length
  }

  #record(key, now) {
    if (!this.#windows.has(key)) {
      this.#windows.set(key, [])
    }
    const timestamps = this.#windows.get(key)
    timestamps.push(now)

    // Cleanup old entries
    const cutoff = now - 86400000 // Keep 24h
    const idx = timestamps.findIndex(t => t > cutoff)
    if (idx > 0) {
      this.#windows.set(key, timestamps.slice(idx))
    } else if (idx === -1) {
      this.#windows.set(key, [])
    }
  }

  #getRetryAfter(key, now, windowMs) {
    const timestamps = this.#windows.get(key) || []
    if (timestamps.length === 0) return 0

    const oldest = timestamps[0]
    return Math.max(0, oldest + windowMs - now)
  }

  /**
   * Clear all data
   */
  clear() {
    this.#windows.clear()
  }
}
