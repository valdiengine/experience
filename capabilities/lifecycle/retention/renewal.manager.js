/**
 * Renewal Manager — Handle subscription renewals and expirations
 *
 * Business-agnostic: tracks renewal dates, emits events
 */

import { LIFECYCLE_EVENTS } from '../lifecycle.events.js'

export class RenewalManager {
  #renewals = new Map()
  #context = null
  #eventBus = null

  constructor(context) {
    this.#context = context
    this.#eventBus = context.eventBus
  }

  /**
   * Set renewal date for a tenant
   * @param {string} tenantId
   * @param {string} renewalDate
   * @returns {object}
   */
  setRenewal(tenantId, renewalDate) {
    if (!tenantId) return { success: false, error: 'Tenant ID is required' }

    const renewal = {
      tenantId,
      renewalDate,
      status: 'pending',
      lastChecked: new Date().toISOString(),
      notificationsSent: 0,
    }

    this.#renewals.set(tenantId, renewal)
    return { success: true, renewal }
  }

  /**
   * Get renewal for a tenant
   * @param {string} tenantId
   * @returns {object|null}
   */
  get(tenantId) {
    return this.#renewals.get(tenantId) || null
  }

  /**
   * Check upcoming renewals
   * @param {number} daysAhead
   * @returns {object[]}
   */
  getUpcoming(daysAhead = 30) {
    const cutoff = new Date(Date.now() + daysAhead * 86400000)
    return Array.from(this.#renewals.values())
      .filter(r => r.status === 'pending' && new Date(r.renewalDate) <= cutoff)
      .sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate))
  }

  /**
   * Check if renewal is due
   * @param {string} tenantId
   * @param {number} warningDays
   * @returns {object}
   */
  checkRenewal(tenantId, warningDays = 7) {
    const renewal = this.#renewals.get(tenantId)
    if (!renewal || renewal.status !== 'pending') return { due: false }

    const renewalDate = new Date(renewal.renewalDate)
    const now = new Date()
    const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / 86400000)

    if (daysUntil <= 0) {
      this.#emit(LIFECYCLE_EVENTS.CUSTOMER_RENEWAL_DUE, { tenantId, overdue: true })
      return { due: true, overdue: true, daysUntil }
    }

    if (daysUntil <= warningDays) {
      this.#emit(LIFECYCLE_EVENTS.CUSTOMER_RENEWAL_DUE, { tenantId, overdue: false, daysUntil })
      return { due: true, overdue: false, daysUntil }
    }

    return { due: false, daysUntil }
  }

  /**
   * Mark renewal as completed
   * @param {string} tenantId
   * @returns {object}
   */
  complete(tenantId) {
    const renewal = this.#renewals.get(tenantId)
    if (!renewal) return { success: false, error: 'No renewal found' }

    renewal.status = 'completed'
    renewal.completedAt = new Date().toISOString()

    this.#renewals.set(tenantId, renewal)
    this.#emit(LIFECYCLE_EVENTS.CUSTOMER_RENEWED, { tenantId })
    return { success: true, renewal }
  }

  /**
   * Process renewal
   * @param {string} tenantId
   * @returns {object}
   */
  process(tenantId) {
    const renewal = this.#renewals.get(tenantId)
    if (!renewal) return { success: false, error: 'No renewal found' }

    const billing = this.#context?.capabilities?.get?.('billing')
    if (billing?.processRenewal) {
      const saas = this.#context?.capabilities?.get?.('saas')
      const subscription = saas?.getSubscription?.(tenantId)
      if (subscription) {
        billing.processRenewal(tenantId, subscription.subscriptionId, subscription.planId, 0)
      }
    }

    this.complete(tenantId)
    return { success: true }
  }

  /**
   * Get all renewals
   * @param {object} filter - { status }
   * @returns {object[]}
   */
  getAll(filter = {}) {
    let renewals = Array.from(this.#renewals.values())
    if (filter.status) renewals = renewals.filter(r => r.status === filter.status)
    return renewals
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
