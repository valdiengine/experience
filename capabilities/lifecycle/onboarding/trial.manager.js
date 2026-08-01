/**
 * Trial Manager — Free trial lifecycle
 *
 * Business-agnostic: trial start, expiration, conversion
 * Communicates with SaaS through context.capabilities.get('saas')
 */

import { TRIAL_STATUSES, TRIAL_SCHEMA } from '../lifecycle.schema.js'
import { LIFECYCLE_EVENTS } from '../lifecycle.events.js'

export class TrialManager {
  #trials = new Map()
  #context = null
  #eventBus = null

  constructor(context) {
    this.#context = context
    this.#eventBus = context.eventBus
  }

  /**
   * Start a trial for a tenant
   * @param {string} tenantId
   * @param {string} planId
   * @param {number} durationDays
   * @returns {object}
   */
  start(tenantId, planId, durationDays = 14) {
    if (!tenantId) return { success: false, error: 'Tenant ID is required' }
    if (!planId) return { success: false, error: 'Plan ID is required' }

    const existing = this.#trials.get(tenantId)
    if (existing?.status === TRIAL_STATUSES.ACTIVE) {
      return { success: false, error: 'Active trial already exists' }
    }

    const now = new Date()
    const endDate = new Date(now.getTime() + durationDays * 86400000)

    const trial = {
      ...TRIAL_SCHEMA,
      tenantId,
      planId,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      status: TRIAL_STATUSES.ACTIVE,
      durationDays,
      metadata: {},
    }

    this.#trials.set(tenantId, trial)

    const saas = this.#context?.capabilities?.get?.('saas')
    if (saas?.assignPlan) {
      saas.assignPlan(tenantId, planId, { productId: planId })
    }

    this.#emit(LIFECYCLE_EVENTS.TRIAL_STARTED, { tenantId, planId, endDate: trial.endDate })
    return { success: true, trial }
  }

  /**
   * Get trial for tenant
   * @param {string} tenantId
   * @returns {object|null}
   */
  get(tenantId) {
    return this.#trials.get(tenantId) || null
  }

  /**
   * Check if trial is expired
   * @param {string} tenantId
   * @returns {boolean}
   */
  isExpired(tenantId) {
    const trial = this.#trials.get(tenantId)
    if (!trial) return false
    if (trial.status !== TRIAL_STATUSES.ACTIVE) return false
    return new Date(trial.endDate) < new Date()
  }

  /**
   * Check trial expiration and emit events
   * @param {string} tenantId
   * @returns {object}
   */
  checkExpiration(tenantId) {
    const trial = this.#trials.get(tenantId)
    if (!trial) return { expired: false }

    if (trial.status !== TRIAL_STATUSES.ACTIVE) return { expired: false }

    const now = new Date()
    const endDate = new Date(trial.endDate)
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / 86400000)

    if (daysRemaining <= 0) {
      this.expire(tenantId)
      return { expired: true, reason: 'trial_ended' }
    }

    if (daysRemaining <= 3) {
      this.#emit(LIFECYCLE_EVENTS.TRIAL_ENDING, { tenantId, daysRemaining })
    }

    return { expired: false, daysRemaining }
  }

  /**
   * Convert trial to paid subscription
   * @param {string} tenantId
   * @returns {object}
   */
  convert(tenantId) {
    const trial = this.#trials.get(tenantId)
    if (!trial) return { success: false, error: 'No trial found' }
    if (trial.status !== TRIAL_STATUSES.ACTIVE) return { success: false, error: 'Trial is not active' }

    trial.status = TRIAL_STATUSES.CONVERTED
    trial.convertedAt = new Date().toISOString()

    this.#trials.set(tenantId, trial)

    const saas = this.#context?.capabilities?.get?.('saas')
    if (saas?.reactivateSubscription) {
      saas.reactivateSubscription(tenantId)
    }

    this.#emit(LIFECYCLE_EVENTS.TRIAL_CONVERTED, {
      tenantId,
      planId: trial.planId,
      trialDuration: trial.durationDays,
    })

    return { success: true, trial }
  }

  /**
   * Expire trial
   * @param {string} tenantId
   * @returns {object}
   */
  expire(tenantId) {
    const trial = this.#trials.get(tenantId)
    if (!trial) return { success: false, error: 'No trial found' }

    trial.status = TRIAL_STATUSES.EXPIRED
    trial.expiredAt = new Date().toISOString()

    this.#trials.set(tenantId, trial)

    const saas = this.#context?.capabilities?.get?.('saas')
    if (saas?.suspendSubscription) {
      saas.suspendSubscription(tenantId)
    }

    this.#emit(LIFECYCLE_EVENTS.TRIAL_EXPIRED, { tenantId, planId: trial.planId })
    return { success: true, trial }
  }

  /**
   * Cancel trial
   * @param {string} tenantId
   * @returns {object}
   */
  cancel(tenantId) {
    const trial = this.#trials.get(tenantId)
    if (!trial) return { success: false, error: 'No trial found' }

    trial.status = TRIAL_STATUSES.CANCELLED
    trial.cancelledAt = new Date().toISOString()

    this.#trials.set(tenantId, trial)
    this.#emit(LIFECYCLE_EVENTS.TRIAL_CANCELLED, { tenantId })
    return { success: true, trial }
  }

  /**
   * Get all trials
   * @param {object} filter - { status }
   * @returns {object[]}
   */
  getAll(filter = {}) {
    let trials = Array.from(this.#trials.values())
    if (filter.status) trials = trials.filter(t => t.status === filter.status)
    return trials
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
