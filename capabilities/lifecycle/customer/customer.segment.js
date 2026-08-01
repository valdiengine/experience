/**
 * Customer Segment — Automatic classification engine
 *
 * Business-agnostic: segments based on usage, plan, activity
 */

import { CUSTOMER_SEGMENTS, CUSTOMER_STATUSES } from '../lifecycle.schema.js'

export class CustomerSegment {
  #segmentRules = new Map()

  constructor() {
    this.#registerDefaultRules()
  }

  /**
   * Evaluate customer segment
   * @param {object} customer - { plan, status, healthScore, lastActivity, activities, metadata }
   * @returns {object} - { segment, score, factors }
   */
  evaluate(customer) {
    if (!customer) return { segment: CUSTOMER_SEGMENTS.NEW_CUSTOMER, score: 0, factors: [] }

    const factors = []
    let score = 0

    // Check trial status
    if (customer.plan?.includes('trial') || customer.status === CUSTOMER_STATUSES.TRIAL) {
      factors.push('active_trial')
      return { segment: CUSTOMER_SEGMENTS.TRIAL_ACTIVE, score: 100, factors }
    }

    // Check inactivity
    const lastActivity = customer.lastActivity ? new Date(customer.lastActivity) : null
    const daysSinceActivity = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / 86400000) : 999

    if (daysSinceActivity > 30) {
      factors.push(`inactive_${daysSinceActivity}_days`)
      score -= 40
    } else if (daysSinceActivity > 7) {
      factors.push(`low_activity_${daysSinceActivity}_days`)
      score -= 20
    } else {
      factors.push('recent_activity')
      score += 20
    }

    // Check health score
    if (customer.healthScore >= 80) {
      factors.push('high_health')
      score += 30
    } else if (customer.healthScore >= 50) {
      factors.push('medium_health')
      score += 10
    } else if (customer.healthScore < 30) {
      factors.push('low_health')
      score -= 30
    }

    // Check plan level
    const planScores = {
      free_directory: 0,
      basic_business: 10,
      intermediate_business: 20,
      advanced_website: 30,
      premium_landing: 40,
      accommodation_webapp: 50,
      accommodation_partner: 40,
      magnum_saas: 80,
    }
    const planScore = planScores[customer.plan] || 0
    score += planScore
    if (planScore > 0) factors.push(`plan_${customer.plan}`)

    // Check activity count
    const activityCount = customer.activities?.length || 0
    if (activityCount > 50) {
      factors.push('high_engagement')
      score += 25
    } else if (activityCount > 10) {
      factors.push('medium_engagement')
      score += 10
    } else if (activityCount === 0) {
      factors.push('no_engagement')
      score -= 25
    }

    // Determine segment
    let segment
    if (score >= 80) {
      segment = CUSTOMER_SEGMENTS.PREMIUM_CUSTOMER
    } else if (score >= 50) {
      segment = CUSTOMER_SEGMENTS.GROWING_BUSINESS
    } else if (score >= 20) {
      segment = customer.plan === 'free_directory' || customer.plan === 'free'
        ? CUSTOMER_SEGMENTS.ACTIVE_FREE
        : CUSTOMER_SEGMENTS.GROWING_BUSINESS
    } else if (score >= 0) {
      segment = CUSTOMER_SEGMENTS.INACTIVE_CUSTOMER
    } else {
      segment = CUSTOMER_SEGMENTS.CHURN_RISK
    }

    // Check if ecosystem partner
    if (customer.plan === 'accommodation_partner') {
      segment = CUSTOMER_SEGMENTS.ECOSYSTEM_PARTNER
    }

    return { segment, score: Math.max(0, Math.min(100, score)), factors }
  }

  /**
   * Get segment description
   * @param {string} segment
   * @returns {object}
   */
  getDescription(segment) {
    const descriptions = {
      [CUSTOMER_SEGMENTS.NEW_CUSTOMER]: { name: 'New Customer', description: 'Recently registered, not yet activated', priority: 'medium' },
      [CUSTOMER_SEGMENTS.ACTIVE_FREE]: { name: 'Active Free', description: 'Free plan with active usage', priority: 'medium' },
      [CUSTOMER_SEGMENTS.GROWING_BUSINESS]: { name: 'Growing Business', description: 'Active paid customer with growth potential', priority: 'high' },
      [CUSTOMER_SEGMENTS.PREMIUM_CUSTOMER]: { name: 'Premium Customer', description: 'High-value customer on premium plan', priority: 'high' },
      [CUSTOMER_SEGMENTS.INACTIVE_CUSTOMER]: { name: 'Inactive Customer', description: 'Low activity, needs re-engagement', priority: 'medium' },
      [CUSTOMER_SEGMENTS.CHURN_RISK]: { name: 'Churn Risk', description: 'At risk of churning, needs immediate attention', priority: 'critical' },
      [CUSTOMER_SEGMENTS.TRIAL_ACTIVE]: { name: 'Trial Active', description: 'Currently in free trial period', priority: 'high' },
      [CUSTOMER_SEGMENTS.TRIAL_CONVERTED]: { name: 'Trial Converted', description: 'Converted from trial to paid', priority: 'medium' },
      [CUSTOMER_SEGMENTS.ECOSYSTEM_PARTNER]: { name: 'Ecosystem Partner', description: 'Accommodation partner in reservation ecosystem', priority: 'medium' },
    }
    return descriptions[segment] || { name: segment, description: 'Unknown segment', priority: 'low' }
  }

  /**
   * Get all segments
   * @returns {object[]}
   */
  getAllSegments() {
    return Object.values(CUSTOMER_SEGMENTS).map(s => ({
      id: s,
      ...this.getDescription(s),
    }))
  }

  #registerDefaultRules() {
    this.#segmentRules.set('trial', {
      check: (c) => c.plan?.includes('trial') || c.status === CUSTOMER_STATUSES.TRIAL,
      segment: CUSTOMER_SEGMENTS.TRIAL_ACTIVE,
    })
    this.#segmentRules.set('inactive', {
      check: (c) => {
        const last = c.lastActivity ? new Date(c.lastActivity) : null
        return last && (Date.now() - last.getTime()) > 30 * 86400000
      },
      segment: CUSTOMER_SEGMENTS.INACTIVE_CUSTOMER,
    })
    this.#segmentRules.set('churn_risk', {
      check: (c) => c.healthScore < 20,
      segment: CUSTOMER_SEGMENTS.CHURN_RISK,
    })
  }
}
