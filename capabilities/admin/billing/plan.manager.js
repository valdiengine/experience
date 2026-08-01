/**
 * Plan Manager — SaaS plan management
 *
 * Business-agnostic: manages plans, limits, capability access
 * No payment gateway yet — only architecture
 */
import { SAAS_PLANS, PLAN_LIMITS } from '../admin.schema.js'

export class PlanManager {
  #context = null
  #plans = new Map()

  constructor(context) {
    this.#context = context
    this.#initPlans()
  }

  #initPlans() {
    Object.entries(PLAN_LIMITS).forEach(([plan, limits]) => {
      this.#plans.set(plan, {
        id: plan,
        name: plan.charAt(0).toUpperCase() + plan.slice(1),
        limits,
        features: this.#getPlanFeatures(plan),
      })
    })
  }

  /**
   * Get all available plans
   * @returns {object[]}
   */
  getAllPlans() {
    return Array.from(this.#plans.values())
  }

  /**
   * Get plan by ID
   * @param {string} planId
   * @returns {object|null}
   */
  getPlan(planId) {
    return this.#plans.get(planId) || null
  }

  /**
   * Get plan limits
   * @param {string} planId
   * @returns {object|null}
   */
  getLimits(planId) {
    return this.#plans.get(planId)?.limits || null
  }

  /**
   * Check if plan includes capability
   * @param {string} planId
   * @param {string} capabilityId
   * @returns {boolean}
   */
  planIncludesCapability(planId, capabilityId) {
    const limits = this.getLimits(planId)
    if (!limits) return false
    return limits.capabilities.includes(capabilityId)
  }

  /**
   * Check if usage exceeds plan limits
   * @param {string} planId
   * @param {string} metric - 'reservations', 'pages', 'users'
   * @param {number} currentUsage
   * @returns {boolean}
   */
  exceedsLimit(planId, metric, currentUsage) {
    const limits = this.getLimits(planId)
    if (!limits) return true

    const limitKey = `max${metric.charAt(0).toUpperCase() + metric.slice(1)}`
    const limit = limits[limitKey]

    if (limit === -1) return false
    return currentUsage >= limit
  }

  /**
   * Get remaining allowance
   * @param {string} planId
   * @param {string} metric
   * @param {number} currentUsage
   * @returns {number|null} - null if unlimited
   */
  getRemaining(planId, metric, currentUsage) {
    const limits = this.getLimits(planId)
    if (!limits) return 0

    const limitKey = `max${metric.charAt(0).toUpperCase() + metric.slice(1)}`
    const limit = limits[limitKey]

    if (limit === -1) return null
    return Math.max(0, limit - currentUsage)
  }

  /**
   * Get recommended plan based on usage
   * @param {object} usage - { reservations, pages, users }
   * @returns {string}
   */
  getRecommendedPlan(usage) {
    for (const [planId, limits] of this.#plans) {
      const reservationsOk = limits.maxReservations === -1 || (usage.reservations || 0) < limits.maxReservations
      const pagesOk = limits.maxPages === -1 || (usage.pages || 0) < limits.maxPages
      const usersOk = limits.maxUsers === -1 || (usage.users || 0) < limits.maxUsers

      if (reservationsOk && pagesOk && usersOk) {
        return planId
      }
    }
    return SAAS_PLANS.SAAS
  }

  /**
   * Compare plans
   * @param {string} plan1
   * @param {string} plan2
   * @returns {object}
   */
  comparePlans(plan1, plan2) {
    const p1 = this.getPlan(plan1)
    const p2 = this.getPlan(plan2)
    if (!p1 || !p2) return null

    return {
      plan1: { id: p1.id, name: p1.name, limits: p1.limits, features: p1.features },
      plan2: { id: p2.id, name: p2.name, limits: p2.limits, features: p2.features },
      differences: {
        reservations: p1.limits.maxReservations - p2.limits.maxReservations,
        pages: p1.limits.maxPages - p2.limits.maxPages,
        users: p1.limits.maxUsers - p2.limits.maxUsers,
        capabilities: p2.limits.capabilities.filter(c => !p1.limits.capabilities.includes(c)),
      },
    }
  }

  #getPlanFeatures(planId) {
    const features = {
      [SAAS_PLANS.FREE]: [
        'Basic CMS',
        'PWA Support',
        '5 Pages',
        '50 Reservations/month',
      ],
      [SAAS_PLANS.BUSINESS]: [
        'Full CMS',
        'PWA Support',
        'Reservation System',
        'Availability Management',
        'Communication Tools',
        'Email Notifications',
        '25 Pages',
        '500 Reservations/month',
        '5 Users',
      ],
      [SAAS_PLANS.SAAS]: [
        'Full CMS',
        'PWA Engine',
        'Reservation System',
        'Availability Management',
        'Communication Tools',
        'Email Notifications',
        'Intelligence Analytics',
        'SEO Intelligence',
        'Customer Engagement',
        'Conversion Tracking',
        'Unlimited Pages',
        'Unlimited Reservations',
        'Unlimited Users',
        'Priority Support',
      ],
    }
    return features[planId] || []
  }
}
