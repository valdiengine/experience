/**
 * Limits Manager — Tenant resource consumption control
 *
 * Business-agnostic: tracks counts, no business logic
 */

import { SAAS_EVENTS } from './saas.events.js'

export class LimitsManager {
  #usage = new Map()
  #planManager = null
  #eventBus = null

  constructor(planManager, eventBus) {
    this.#planManager = planManager
    this.#eventBus = eventBus
  }

  /**
   * Get limits for a tenant based on their plan
   * @param {string} tenantId
   * @returns {object}
   */
  getLimits(tenantId) {
    const subscription = this.#planManager.getSubscription(tenantId)
    if (!subscription) return {}

    const plan = this.#planManager.get(subscription.planId)
    if (!plan?.limits) return {}

    return plan.limits
  }

  /**
   * Check if tenant has reached a limit
   * @param {string} tenantId
   * @param {string} resource
   * @returns {object} - { allowed: boolean, used: number, max: number, remaining: number }
   */
  checkLimit(tenantId, resource) {
    const limits = this.getLimits(tenantId)

    if (limits.unlimited) {
      return { allowed: true, used: 0, max: -1, remaining: -1, unlimited: true }
    }

    const max = limits[resource]
    if (max === undefined || max === null) {
      return { allowed: true, used: 0, max: -1, remaining: -1, unlimited: true }
    }

    if (max === 0) {
      return { allowed: false, used: 0, max: 0, remaining: 0 }
    }

    const usage = this.#getUsage(tenantId, resource)
    const remaining = Math.max(0, max - usage)

    return {
      allowed: usage < max,
      used: usage,
      max,
      remaining,
      percentage: Math.round((usage / max) * 100),
    }
  }

  /**
   * Increase usage for a resource
   * @param {string} tenantId
   * @param {string} resource
   * @param {number} amount
   * @returns {object}
   */
  increaseUsage(tenantId, resource, amount = 1) {
    const current = this.#getUsage(tenantId, resource)
    const key = `${tenantId}:${resource}`
    this.#usage.set(key, current + amount)

    const check = this.checkLimit(tenantId, resource)

    if (check.max > 0 && check.used >= check.max) {
      this.#eventBus?.emit(SAAS_EVENTS.LIMIT_REACHED, {
        tenantId,
        resource,
        used: check.used,
        max: check.max,
      })
    } else if (check.max > 0 && check.percentage >= 80) {
      this.#eventBus?.emit(SAAS_EVENTS.LIMIT_WARNING, {
        tenantId,
        resource,
        used: check.used,
        max: check.max,
        percentage: check.percentage,
      })
    }

    return check
  }

  /**
   * Reset usage for a resource
   * @param {string} tenantId
   * @param {string} resource
   */
  resetUsage(tenantId, resource) {
    const key = `${tenantId}:${resource}`
    this.#usage.set(key, 0)
    this.#eventBus?.emit(SAAS_EVENTS.LIMIT_RESET, { tenantId, resource })
  }

  /**
   * Reset all usage for a tenant
   * @param {string} tenantId
   */
  resetAllUsage(tenantId) {
    for (const key of this.#usage.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.#usage.set(key, 0)
      }
    }
  }

  /**
   * Get remaining for all resources
   * @param {string} tenantId
   * @returns {object}
   */
  getRemaining(tenantId) {
    const limits = this.getLimits(tenantId)
    if (limits.unlimited) return { unlimited: true }

    const remaining = {}
    for (const [resource, max] of Object.entries(limits)) {
      if (max === -1 || resource === 'unlimited') continue
      const usage = this.#getUsage(tenantId, resource)
      remaining[resource] = Math.max(0, max - usage)
    }
    return remaining
  }

  /**
   * Get usage for all resources
   * @param {string} tenantId
   * @returns {object}
   */
  getUsage(tenantId) {
    const limits = this.getLimits(tenantId)
    const usage = {}

    for (const resource of Object.keys(limits)) {
      if (resource === 'unlimited') continue
      usage[resource] = this.#getUsage(tenantId, resource)
    }
    return usage
  }

  /**
   * Get usage percentage for all resources
   * @param {string} tenantId
   * @returns {object}
   */
  getUsagePercentages(tenantId) {
    const limits = this.getLimits(tenantId)
    if (limits.unlimited) return { unlimited: true }

    const percentages = {}
    for (const [resource, max] of Object.entries(limits)) {
      if (max === 0 || max === -1 || resource === 'unlimited') continue
      const used = this.#getUsage(tenantId, resource)
      percentages[resource] = Math.round((used / max) * 100)
    }
    return percentages
  }

  // ── Private ──

  #getUsage(tenantId, resource) {
    const key = `${tenantId}:${resource}`
    return this.#usage.get(key) || 0
  }
}
