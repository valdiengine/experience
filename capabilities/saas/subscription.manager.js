/**
 * Subscription Manager — Tenant subscription lifecycle
 *
 * Business-agnostic: tracks status only, no payment logic
 */

import { SUBSCRIPTION_STATUSES, SUBSCRIPTION_SCHEMA } from './saas.schema.js'
import { SAAS_EVENTS } from './saas.events.js'

export class SubscriptionManager {
  #subscriptions = new Map()
  #eventBus = null

  constructor(eventBus) {
    this.#eventBus = eventBus
  }

  /**
   * Create subscription
   * @param {string} tenantId
   * @param {string} productId
   * @param {string} planId
   * @param {object} options - { expiresAt }
   * @returns {object}
   */
  create(tenantId, productId, planId, options = {}) {
    if (!tenantId) return { success: false, error: 'Tenant ID is required' }
    if (!productId) return { success: false, error: 'Product ID is required' }
    if (!planId) return { success: false, error: 'Plan ID is required' }

    const existing = this.#subscriptions.get(tenantId)
    if (existing?.status === SUBSCRIPTION_STATUSES.ACTIVE) {
      return { success: false, error: `Tenant ${tenantId} already has an active subscription` }
    }

    const subscription = {
      ...SUBSCRIPTION_SCHEMA,
      tenantId,
      productId,
      planId,
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      startedAt: new Date().toISOString(),
      expiresAt: options.expiresAt || null,
    }

    this.#subscriptions.set(tenantId, subscription)
    this.#emit(SAAS_EVENTS.SUBSCRIPTION_CREATED, { tenantId, subscription })
    return { success: true, subscription }
  }

  /**
   * Get subscription for tenant
   * @param {string} tenantId
   * @returns {object|null}
   */
  get(tenantId) {
    return this.#subscriptions.get(tenantId) || null
  }

  /**
   * Check if subscription is active
   * @param {string} tenantId
   * @returns {boolean}
   */
  isActive(tenantId) {
    const sub = this.get(tenantId)
    if (!sub) return false
    if (sub.status !== SUBSCRIPTION_STATUSES.ACTIVE) return false
    if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) return false
    return true
  }

  /**
   * Get subscription status
   * @param {string} tenantId
   * @returns {string}
   */
  getStatus(tenantId) {
    const sub = this.get(tenantId)
    if (!sub) return 'none'
    if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
      this.#expire(tenantId)
      return SUBSCRIPTION_STATUSES.EXPIRED
    }
    return sub.status
  }

  /**
   * Suspend subscription
   * @param {string} tenantId
   * @param {string} reason
   * @returns {object}
   */
  suspend(tenantId, reason = '') {
    const sub = this.#subscriptions.get(tenantId)
    if (!sub) return { success: false, error: `No subscription for tenant ${tenantId}` }

    sub.status = SUBSCRIPTION_STATUSES.SUSPENDED
    sub.suspendedAt = new Date().toISOString()
    sub.suspensionReason = reason

    this.#subscriptions.set(tenantId, sub)
    this.#emit(SAAS_EVENTS.SUBSCRIPTION_SUSPENDED, { tenantId, reason })
    return { success: true, subscription: sub }
  }

  /**
   * Cancel subscription
   * @param {string} tenantId
   * @param {string} reason
   * @returns {object}
   */
  cancel(tenantId, reason = '') {
    const sub = this.#subscriptions.get(tenantId)
    if (!sub) return { success: false, error: `No subscription for tenant ${tenantId}` }

    sub.status = SUBSCRIPTION_STATUSES.CANCELLED
    sub.cancelledAt = new Date().toISOString()
    sub.cancellationReason = reason

    this.#subscriptions.set(tenantId, sub)
    this.#emit(SAAS_EVENTS.SUBSCRIPTION_CANCELLED, { tenantId, reason })
    return { success: true, subscription: sub }
  }

  /**
   * Reactivate subscription
   * @param {string} tenantId
   * @returns {object}
   */
  reactivate(tenantId) {
    const sub = this.#subscriptions.get(tenantId)
    if (!sub) return { success: false, error: `No subscription for tenant ${tenantId}` }

    sub.status = SUBSCRIPTION_STATUSES.ACTIVE
    sub.reactivatedAt = new Date().toISOString()

    this.#subscriptions.set(tenantId, sub)
    this.#emit(SAAS_EVENTS.SUBSCRIPTION_ACTIVATED, { tenantId })
    return { success: true, subscription: sub }
  }

  /**
   * Get all subscriptions
   * @param {object} filter - { status, planId, productId }
   * @returns {object[]}
   */
  getAll(filter = {}) {
    let subs = Array.from(this.#subscriptions.values())
    if (filter.status) subs = subs.filter(s => s.status === filter.status)
    if (filter.planId) subs = subs.filter(s => s.planId === filter.planId)
    if (filter.productId) subs = subs.filter(s => s.productId === filter.productId)
    return subs
  }

  /**
   * Get subscription count
   * @param {string} status
   * @returns {number}
   */
  count(status) {
    if (status) return this.getAll({ status }).length
    return this.#subscriptions.size
  }

  // ── Private ──

  #expire(tenantId) {
    const sub = this.#subscriptions.get(tenantId)
    if (!sub || sub.status === SUBSCRIPTION_STATUSES.EXPIRED) return

    sub.status = SUBSCRIPTION_STATUSES.EXPIRED
    sub.expiredAt = new Date().toISOString()
    this.#subscriptions.set(tenantId, sub)
    this.#emit(SAAS_EVENTS.SUBSCRIPTION_EXPIRED, { tenantId })
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
