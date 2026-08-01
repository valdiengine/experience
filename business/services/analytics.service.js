/**
 * Business Services — Analytics Service
 *
 * Thin orchestration layer between observability/conversion/intelligence capabilities and UI
 * Business-agnostic: provides operational metrics across all capabilities
 */
export class AnalyticsService {
  #capabilities = null

  constructor(capabilities) {
    this.#capabilities = capabilities
  }

  getMetrics(tenantId) {
    const observability = this.#capabilities.get('observability')
    return observability?.getMetrics(tenantId) || {}
  }

  getHealth(tenantId) {
    const observability = this.#capabilities.get('observability')
    return observability?.getHealth(tenantId) || {}
  }

  getAlerts(tenantId) {
    const observability = this.#capabilities.get('observability')
    return observability?.getAlerts(tenantId) || []
  }

  getConversionStats(tenantId) {
    const conversion = this.#capabilities.get('conversion')
    return conversion?.getStats(tenantId) || {}
  }

  getEngagementStats(tenantId) {
    const engagement = this.#capabilities.get('engagement')
    return engagement?.getStats(tenantId) || {}
  }

  getIntelligence(tenantId) {
    const intelligence = this.#capabilities.get('intelligence')
    return intelligence?.getInsights(tenantId) || {}
  }

  getNotificationStats(tenantId) {
    const notifications = this.#capabilities.get('notifications')
    return notifications?.analytics?.getReport(tenantId) || {}
  }

  getBillingStats(tenantId) {
    const billing = this.#capabilities.get('billing')
    return billing?.getStats(tenantId) || {}
  }

  getLifecycleStats(tenantId) {
    const lifecycle = this.#capabilities.get('lifecycle')
    return {
      customers: lifecycle?.getCustomers(tenantId) || [],
      churnRisk: lifecycle?.getChurnRisk(tenantId) || {},
    }
  }

  getFullReport(tenantId) {
    return {
      metrics: this.getMetrics(tenantId),
      health: this.getHealth(tenantId),
      conversion: this.getConversionStats(tenantId),
      engagement: this.getEngagementStats(tenantId),
      notifications: this.getNotificationStats(tenantId),
      billing: this.getBillingStats(tenantId),
      generatedAt: new Date().toISOString(),
    }
  }
}
