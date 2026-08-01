/**
 * Upgrade Manager — Detect and recommend plan upgrades
 *
 * Business-agnostic: uses SaaS capability for plan information
 * Communicates with SaaS through context.capabilities.get('saas')
 */

import { LIFECYCLE_EVENTS } from '../lifecycle.events.js'

export class UpgradeManager {
  #context = null
  #eventBus = null

  constructor(context) {
    this.#context = context
    this.#eventBus = context.eventBus
  }

  /**
   * Get upgrade recommendation for a tenant
   * @param {string} tenantId
   * @returns {object|null}
   */
  getRecommendation(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.getSubscription || !saas?.getPlan) return null

    const subscription = saas.getSubscription(tenantId)
    if (!subscription) return null

    const currentPlan = saas.getPlan(subscription.planId)
    if (!currentPlan) return null

    const growth = saas.analyzeGrowth?.(tenantId)
    const upgrade = saas.recommendUpgrade?.(tenantId)

    if (!currentPlan.recommendedUpgrade && !upgrade) return null

    const recommendedPlan = saas.getPlan(currentPlan.recommendedUpgrade)
    if (!recommendedPlan && !upgrade) return null

    const recommendation = {
      tenantId,
      currentPlanId: currentPlan.id,
      currentPlanName: currentPlan.name,
      recommendedPlanId: upgrade?.recommendedPlanId || recommendedPlan?.id,
      recommendedPlanName: upgrade?.recommendedPlanName || recommendedPlan?.name,
      reasons: upgrade?.reasons || [],
      additionalCapabilities: upgrade?.additionalCapabilities || [],
      additionalFeatures: upgrade?.additionalFeatures || [],
      growth: growth || null,
      priority: this.#calculatePriority(growth, currentPlan),
    }

    this.#emit(LIFECYCLE_EVENTS.UPGRADE_RECOMMENDED, recommendation)
    return recommendation
  }

  /**
   * Request an upgrade
   * @param {string} tenantId
   * @param {string} targetPlanId
   * @returns {object}
   */
  requestUpgrade(tenantId, targetPlanId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.changePlan) return { success: false, error: 'SaaS capability not available' }

    const result = saas.changePlan(tenantId, targetPlanId)
    if (result.success) {
      this.#emit(LIFECYCLE_EVENTS.UPGRADE_REQUESTED, {
        tenantId,
        targetPlanId,
      })
    }
    return result
  }

  /**
   * Get all available upgrades for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getAvailableUpgrades(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.getAvailableUpgrades) return []

    return saas.getAvailableUpgrades(tenantId)
  }

  /**
   * Compare current plan with target
   * @param {string} tenantId
   * @param {string} targetPlanId
   * @returns {object}
   */
  comparePlans(tenantId, targetPlanId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.getSubscription || !saas?.comparePlans) return null

    const subscription = saas.getSubscription(tenantId)
    if (!subscription) return null

    return saas.comparePlans(subscription.planId, targetPlanId)
  }

  /**
   * Get upgrade path for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getUpgradePath(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.getUpgradePath) return []

    return saas.getUpgradePath(tenantId)
  }

  #calculatePriority(growth, currentPlan) {
    if (!growth) return 'medium'
    if (growth.needsUpgrade) return 'high'
    if (growth.bottlenecks?.length > 0) return 'medium'
    return 'low'
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }
}
