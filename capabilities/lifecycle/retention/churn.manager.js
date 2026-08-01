/**
 * Churn Manager — Detect and score churn risk
 *
 * Business-agnostic: churn detection based on activity, usage, engagement
 */

import { HEALTH_RISK_LEVELS, CUSTOMER_SEGMENTS } from '../lifecycle.schema.js'
import { LIFECYCLE_EVENTS } from '../lifecycle.events.js'

export class ChurnManager {
  #churnScores = new Map()
  #context = null
  #eventBus = null

  constructor(context) {
    this.#context = context
    this.#eventBus = context.eventBus
  }

  /**
   * Calculate churn risk score for a tenant
   * @param {string} tenantId
   * @returns {object} - { score, riskLevel, factors }
   */
  calculateRisk(tenantId) {
    const customerManager = this.#context?.lifecycle?.customerManager
    const customer = customerManager?.get?.(tenantId)

    let score = 0
    const factors = []

    // Activity recency
    const lastActivity = customer?.lastActivity ? new Date(customer.lastActivity) : null
    const daysSinceActivity = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / 86400000) : 999

    if (daysSinceActivity > 30) {
      score += 40
      factors.push({ factor: 'inactive_30_days', impact: 40 })
    } else if (daysSinceActivity > 14) {
      score += 25
      factors.push({ factor: 'inactive_14_days', impact: 25 })
    } else if (daysSinceActivity > 7) {
      score += 10
      factors.push({ factor: 'inactive_7_days', impact: 10 })
    }

    // Health score
    if (customer?.healthScore < 30) {
      score += 30
      factors.push({ factor: 'low_health_score', impact: 30 })
    } else if (customer?.healthScore < 50) {
      score += 15
      factors.push({ factor: 'medium_health_score', impact: 15 })
    }

    // Usage decline
    const usage = this.#context?.lifecycle?.usageAnalyzer?.getSummary?.(tenantId)
    if (usage?.totalEvents === 0) {
      score += 20
      factors.push({ factor: 'no_usage', impact: 20 })
    }

    // Plan level
    if (customer?.plan === 'free_directory' || customer?.plan === 'free') {
      score += 10
      factors.push({ factor: 'free_plan', impact: 10 })
    }

    // Activity count
    const activityCount = customer?.activities?.length || 0
    if (activityCount < 5) {
      score += 15
      factors.push({ factor: 'low_engagement', impact: 15 })
    }

    const riskLevel = this.#getRiskLevel(score)
    const result = {
      tenantId,
      score: Math.min(100, score),
      riskLevel,
      factors,
      lastCalculated: new Date().toISOString(),
    }

    this.#churnScores.set(tenantId, result)

    if (riskLevel === HEALTH_RISK_LEVELS.HIGH || riskLevel === HEALTH_RISK_LEVELS.CRITICAL) {
      this.#emit(LIFECYCLE_EVENTS.CUSTOMER_CHURN_RISK, result)
    }

    return result
  }

  /**
   * Get churn risk for a tenant
   * @param {string} tenantId
   * @returns {object|null}
   */
  getRisk(tenantId) {
    return this.#churnScores.get(tenantId) || null
  }

  /**
   * Get all high-risk customers
   * @returns {object[]}
   */
  getHighRisk() {
    return Array.from(this.#churnScores.values())
      .filter(c => c.riskLevel === HEALTH_RISK_LEVELS.HIGH || c.riskLevel === HEALTH_RISK_LEVELS.CRITICAL)
      .sort((a, b) => b.score - a.score)
  }

  /**
   * Get churn risk distribution
   * @returns {object}
   */
  getDistribution() {
    const scores = Array.from(this.#churnScores.values())
    return {
      total: scores.length,
      low: scores.filter(c => c.riskLevel === HEALTH_RISK_LEVELS.LOW).length,
      medium: scores.filter(c => c.riskLevel === HEALTH_RISK_LEVELS.MEDIUM).length,
      high: scores.filter(c => c.riskLevel === HEALTH_RISK_LEVELS.HIGH).length,
      critical: scores.filter(c => c.riskLevel === HEALTH_RISK_LEVELS.CRITICAL).length,
    }
  }

  /**
   * Mark customer as recovered
   * @param {string} tenantId
   * @returns {object}
   */
  markRecovered(tenantId) {
    const score = this.#churnScores.get(tenantId)
    if (!score) return { success: false, error: 'No churn score found' }

    this.#churnScores.delete(tenantId)
    this.#emit(LIFECYCLE_EVENTS.CUSTOMER_RECOVERED, { tenantId })
    return { success: true }
  }

  #getRiskLevel(score) {
    if (score >= 71) return HEALTH_RISK_LEVELS.CRITICAL
    if (score >= 51) return HEALTH_RISK_LEVELS.HIGH
    if (score >= 31) return HEALTH_RISK_LEVELS.MEDIUM
    return HEALTH_RISK_LEVELS.LOW
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
