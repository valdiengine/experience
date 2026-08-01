/**
 * Recommendation Manager — Generate personalized recommendations
 *
 * Business-agnostic: recommendations based on usage, plan, business type
 */

export class RecommendationManager {
  #context = null
  #eventBus = null

  constructor(context) {
    this.#context = context
    this.#eventBus = context.eventBus
  }

  /**
   * Get recommendations for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getRecommendations(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.getSubscription || !saas?.getPlan) return []

    const subscription = saas.getSubscription(tenantId)
    if (!subscription) return []

    const plan = saas.getPlan(subscription.planId)
    if (!plan) return []

    const recommendations = []

    // Check if missing capabilities
    const missingCaps = this.#getMissingCapabilities(plan)
    if (missingCaps.length > 0) {
      recommendations.push({
        type: 'capability_gap',
        priority: 'medium',
        title: 'Missing capabilities',
        description: `Your plan doesn't include: ${missingCaps.join(', ')}`,
        missingCapabilities: missingCaps,
      })
    }

    // Check usage
    const usage = saas.getUsagePercentages?.(tenantId)
    if (usage) {
      const highUsage = Object.entries(usage).filter(([, pct]) => pct >= 70)
      if (highUsage.length > 0) {
        recommendations.push({
          type: 'usage_high',
          priority: 'high',
          title: 'High resource usage',
          description: `You're using ${highUsage.map(([k, v]) => `${k} (${v}%)`).join(', ')}`,
          resources: highUsage.map(([k, v]) => ({ resource: k, percentage: v })),
        })
      }
    }

    // Check upgrade path
    if (plan.recommendedUpgrade) {
      const nextPlan = saas.getPlan(plan.recommendedUpgrade)
      if (nextPlan) {
        recommendations.push({
          type: 'upgrade_available',
          priority: 'low',
          title: `Upgrade to ${nextPlan.name}`,
          description: nextPlan.description,
          targetPlanId: nextPlan.id,
          additionalCapabilities: nextPlan.capabilities.filter(c => !plan.capabilities.includes(c)),
        })
      }
    }

    // Check activation
    const activation = this.#context?.lifecycle?.getActivationStatus?.(tenantId)
    if (activation && !activation.isComplete) {
      recommendations.push({
        type: 'activation_incomplete',
        priority: 'medium',
        title: 'Complete your setup',
        description: `${activation.completed}/${activation.total} steps completed`,
        blockers: activation.blockers,
      })
    }

    return recommendations
  }

  /**
   * Get feature recommendations
   * @param {string} tenantId
   * @returns {object[]}
   */
  getFeatureRecommendations(tenantId) {
    const saas = this.#context?.capabilities?.get?.('saas')
    if (!saas?.getSubscription || !saas?.getPlan) return []

    const subscription = saas.getSubscription(tenantId)
    if (!subscription) return []

    const plan = saas.getPlan(subscription.planId)
    if (!plan) return []

    const features = []
    const allFeatures = [
      { id: 'seo_intelligence', name: 'SEO Intelligence', capability: 'seo-intelligence', description: 'Optimize your online presence' },
      { id: 'automation', name: 'Automation', capability: 'scheduler', description: 'Automate repetitive tasks' },
      { id: 'analytics', name: 'Analytics', capability: 'observability', description: 'Track your business performance' },
      { id: 'engagement', name: 'Customer Engagement', capability: 'engagement', description: 'Build customer relationships' },
      { id: 'conversion', name: 'Conversion Intelligence', capability: 'conversion', description: 'Turn visitors into customers' },
      { id: 'intelligence', name: 'Business Intelligence', capability: 'intelligence', description: 'AI-powered recommendations' },
    ]

    for (const feat of allFeatures) {
      if (!plan.capabilities.includes(feat.capability)) {
        features.push({
          id: feat.id,
          name: feat.name,
          description: feat.description,
          requiredCapability: feat.capability,
        })
      }
    }

    return features
  }

  #getMissingCapabilities(plan) {
    const recommended = [
      'seo-intelligence', 'automation', 'analytics',
      'engagement', 'conversion', 'intelligence',
    ]
    return recommended.filter(c => !plan.capabilities.includes(c))
  }
}
