/**
 * Subscription Manager — Tenant subscription tracking
 *
 * Business-agnostic: tracks active plan, limits, capability access, usage
 * No payment gateway yet — only architecture
 */
import { SAAS_PLANS, PLAN_LIMITS } from '../admin.schema.js'
import { ADMIN_EVENTS } from '../admin.events.js'

export class SubscriptionManager {
  #context = null
  #subscriptions = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Get subscription for tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getSubscription(tenantId) {
    return this.#subscriptions.get(tenantId) || {
      tenantId,
      plan: SAAS_PLANS.FREE,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: null,
      usage: { reservations: 0, pages: 0, users: 0 },
    }
  }

  /**
   * Create or update subscription
   * @param {string} tenantId
   * @param {string} plan
   * @returns {object}
   */
  setSubscription(tenantId, plan) {
    const existing = this.getSubscription(tenantId)
    const oldPlan = existing.plan

    const subscription = {
      ...existing,
      tenantId,
      plan,
      status: 'active',
      startDate: existing.startDate || new Date().toISOString(),
      limits: PLAN_LIMITS[plan] || PLAN_LIMITS[SAAS_PLANS.FREE],
    }

    this.#subscriptions.set(tenantId, subscription)

    if (oldPlan !== plan) {
      this.#context?.eventBus?.emit(ADMIN_EVENTS.PLAN_CHANGED, {
        tenantId,
        oldPlan,
        newPlan: plan,
      })
    }

    return subscription
  }

  /**
   * Check if subscription is active
   * @param {string} tenantId
   * @returns {boolean}
   */
  isActive(tenantId) {
    const sub = this.getSubscription(tenantId)
    return sub.status === 'active'
  }

  /**
   * Get subscription status
   * @param {string} tenantId
   * @returns {string}
   */
  getStatus(tenantId) {
    return this.getSubscription(tenantId).status
  }

  /**
   * Update usage
   * @param {string} tenantId
   * @param {string} metric
   * @param {number} value
   * @returns {object}
   */
  updateUsage(tenantId, metric, value) {
    const sub = this.getSubscription(tenantId)
    sub.usage[metric] = value
    this.#subscriptions.set(tenantId, sub)
    return sub
  }

  /**
   * Increment usage
   * @param {string} tenantId
   * @param {string} metric
   * @returns {number}
   */
  incrementUsage(tenantId, metric) {
    const sub = this.getSubscription(tenantId)
    sub.usage[metric] = (sub.usage[metric] || 0) + 1
    this.#subscriptions.set(tenantId, sub)
    return sub.usage[metric]
  }

  /**
   * Check if usage exceeds limit
   * @param {string} tenantId
   * @param {string} metric
   * @returns {boolean}
   */
  exceedsLimit(tenantId, metric) {
    const sub = this.getSubscription(tenantId)
    const limits = PLAN_LIMITS[sub.plan] || PLAN_LIMITS[SAAS_PLANS.FREE]

    const limitKey = `max${metric.charAt(0).toUpperCase() + metric.slice(1)}`
    const limit = limits[limitKey]

    if (limit === -1) return false
    return (sub.usage[metric] || 0) >= limit
  }

  /**
   * Get usage percentage
   * @param {string} tenantId
   * @param {string} metric
   * @returns {number} - 0-100
   */
  getUsagePercentage(tenantId, metric) {
    const sub = this.getSubscription(tenantId)
    const limits = PLAN_LIMITS[sub.plan] || PLAN_LIMITS[SAAS_PLANS.FREE]

    const limitKey = `max${metric.charAt(0).toUpperCase() + metric.slice(1)}`
    const limit = limits[limitKey]

    if (limit === -1) return 0
    return Math.min(100, Math.round(((sub.usage[metric] || 0) / limit) * 100))
  }

  /**
   * Suspend subscription
   * @param {string} tenantId
   * @param {string} reason
   * @returns {object}
   */
  suspend(tenantId, reason) {
    const sub = this.getSubscription(tenantId)
    sub.status = 'suspended'
    sub.suspensionReason = reason
    this.#subscriptions.set(tenantId, sub)
    return sub
  }

  /**
   * Reactivate subscription
   * @param {string} tenantId
   * @returns {object}
   */
  reactivate(tenantId) {
    const sub = this.getSubscription(tenantId)
    sub.status = 'active'
    sub.suspensionReason = null
    this.#subscriptions.set(tenantId, sub)
    return sub
  }

  /**
   * Get all subscriptions
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#subscriptions.values())
  }

  /**
   * Get subscriptions by plan
   * @param {string} plan
   * @returns {object[]}
   */
  getByPlan(plan) {
    return this.getAll().filter(s => s.plan === plan)
  }
}
