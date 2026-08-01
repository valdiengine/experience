/**
 * Upgrade Manager — Detect growth opportunities and recommend upgrades
 *
 * Business-agnostic: analyzes usage patterns, suggests plan changes
 */

import { SAAS_EVENTS } from './saas.events.js'

export class UpgradeManager {
  #planManager = null
  #limitsManager = null
  #eventBus = null

  constructor(planManager, limitsManager, eventBus) {
    this.#planManager = planManager
    this.#limitsManager = limitsManager
    this.#eventBus = eventBus
  }

  /**
   * Recommend upgrade for a tenant
   * @param {string} tenantId
   * @returns {object|null}
   */
  recommendUpgrade(tenantId) {
    const subscription = this.#planManager.getSubscription(tenantId)
    if (!subscription) return null

    const currentPlan = this.#planManager.get(subscription.planId)
    if (!currentPlan) return null

    const usagePercentages = this.#limitsManager.getUsagePercentages(tenantId)
    const reasons = []

    for (const [resource, percentage] of Object.entries(usagePercentages)) {
      if (percentage >= 80) {
        reasons.push({
          resource,
          percentage,
          message: `${resource} usage at ${percentage}%`,
        })
      }
    }

    if (!currentPlan.recommendedUpgrade) return null

    const recommendedPlan = this.#planManager.get(currentPlan.recommendedUpgrade)
    if (!recommendedPlan) return null

    const upgrade = {
      tenantId,
      currentPlanId: currentPlan.id,
      currentPlanName: currentPlan.name,
      recommendedPlanId: recommendedPlan.id,
      recommendedPlanName: recommendedPlan.name,
      reasons,
      additionalCapabilities: recommendedPlan.capabilities.filter(
        c => !currentPlan.capabilities.includes(c)
      ),
      additionalFeatures: recommendedPlan.features.filter(
        f => !currentPlan.features.includes(f)
      ),
    }

    this.#eventBus?.emit(SAAS_EVENTS.UPGRADE_RECOMMENDED, upgrade)
    return upgrade
  }

  /**
   * Compare current plan with another
   * @param {string} tenantId
   * @param {string} targetPlanId
   * @returns {object}
   */
  compareWithPlan(tenantId, targetPlanId) {
    const subscription = this.#planManager.getSubscription(tenantId)
    if (!subscription) return null

    return this.#planManager.compare(subscription.planId, targetPlanId)
  }

  /**
   * Get upgrade path for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getUpgradePath(tenantId) {
    const subscription = this.#planManager.getSubscription(tenantId)
    if (!subscription) return []

    const path = []
    let currentPlanId = subscription.planId

    while (currentPlanId) {
      const plan = this.#planManager.get(currentPlanId)
      if (!plan) break

      path.push({
        planId: plan.id,
        planName: plan.name,
        category: plan.category,
        capabilities: plan.capabilities,
        features: plan.features,
      })

      currentPlanId = plan.recommendedUpgrade
    }

    return path
  }

  /**
   * Check if tenant needs upgrade
   * @param {string} tenantId
   * @returns {boolean}
   */
  needsUpgrade(tenantId) {
    const usagePercentages = this.#limitsManager.getUsagePercentages(tenantId)
    for (const percentage of Object.values(usagePercentages)) {
      if (percentage >= 80) return true
    }
    return false
  }

  /**
   * Get growth analysis for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  analyzeGrowth(tenantId) {
    const subscription = this.#planManager.getSubscription(tenantId)
    if (!subscription) return { hasSubscription: false }

    const currentPlan = this.#planManager.get(subscription.planId)
    const usagePercentages = this.#limitsManager.getUsagePercentages(tenantId)
    const usage = this.#limitsManager.getUsage(tenantId)

    const bottlenecks = []
    for (const [resource, percentage] of Object.entries(usagePercentages)) {
      if (percentage >= 50) {
        bottlenecks.push({ resource, percentage, status: percentage >= 80 ? 'critical' : 'warning' })
      }
    }

    return {
      hasSubscription: true,
      planId: currentPlan.id,
      planName: currentPlan.name,
      category: currentPlan.category,
      usage,
      usagePercentages,
      bottlenecks,
      needsUpgrade: bottlenecks.some(b => b.status === 'critical'),
      hasUpgradePath: !!currentPlan.recommendedUpgrade,
      recommendedUpgrade: currentPlan.recommendedUpgrade,
    }
  }

  /**
   * Get all available upgrade options
   * @param {string} tenantId
   * @returns {object[]}
   */
  getAvailableUpgrades(tenantId) {
    const subscription = this.#planManager.getSubscription(tenantId)
    if (!subscription) return this.#planManager.getAll()

    const currentPlan = this.#planManager.get(subscription.planId)
    if (!currentPlan) return this.#planManager.getAll()

    return this.#planManager.getAll().filter(plan => {
      if (plan.id === currentPlan.id) return false
      if (plan.category === currentPlan.category && plan.capabilities.length > currentPlan.capabilities.length) return true
      if (plan.recommendedUpgrade === currentPlan.id) return true
      return false
    })
  }
}
