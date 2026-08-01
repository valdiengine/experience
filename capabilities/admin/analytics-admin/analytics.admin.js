/**
 * Analytics Admin — Analytics dashboard through Observability Capability
 *
 * Business-agnostic: displays business metrics, system metrics, health, alerts
 */
export class AnalyticsAdmin {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Get analytics dashboard
   * @param {string} tenantId
   * @returns {object}
   */
  async getDashboard(tenantId) {
    return {
      business: await this.getBusinessMetrics(tenantId),
      system: await this.getSystemMetrics(tenantId),
      health: await this.getHealthStatus(),
      alerts: await this.getAlerts(tenantId),
    }
  }

  /**
   * Get business metrics
   * @param {string} tenantId
   * @returns {object}
   */
  async getBusinessMetrics(tenantId) {
    const obs = this.#context?.capabilities?.get?.('observability')
    if (!obs?.getMetrics) return {}

    const metrics = await obs.getMetrics(tenantId) || {}

    return {
      reservations: metrics.reservations || { total: 0, confirmed: 0, pending: 0 },
      conversion: metrics.conversion || { rate: 0, leads: 0, converted: 0 },
      occupancy: metrics.occupancy || { rate: 0, available: 0, booked: 0 },
      communication: metrics.communication || { sent: 0, delivered: 0, responses: 0 },
      retention: metrics.retention || { returning: 0, new: 0, rate: 0 },
    }
  }

  /**
   * Get system metrics
   * @param {string} tenantId
   * @returns {object}
   */
  async getSystemMetrics(tenantId) {
    const obs = this.#context?.capabilities?.get?.('observability')
    if (!obs?.getMetrics) return {}

    const metrics = await obs.getMetrics(tenantId) || {}

    return {
      health: metrics.health || { status: 'unknown', uptime: 0 },
      performance: metrics.performance || { loadTime: 0, apiResponse: 0 },
      capabilities: metrics.capabilities || {},
      seo: metrics.seo || { score: 0, pages: 0 },
      pwa: metrics.pwa || { installations: 0, offlineUsage: 0 },
    }
  }

  /**
   * Get health status
   * @returns {object}
   */
  async getHealthStatus() {
    const obs = this.#context?.capabilities?.get?.('observability')
    if (!obs?.runHealthCheck) return { status: 'unknown', checks: [] }

    return obs.runHealthCheck()
  }

  /**
   * Get active alerts
   * @param {string} tenantId
   * @returns {object[]}
   */
  async getAlerts(tenantId) {
    const obs = this.#context?.capabilities?.get?.('observability')
    if (!obs?.getActiveAlerts) return []

    return obs.getActiveAlerts(tenantId) || []
  }

  /**
   * Get alert counts by severity
   * @param {string} tenantId
   * @returns {object}
   */
  async getAlertCounts(tenantId) {
    const alerts = await this.getAlerts(tenantId)

    return {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
    }
  }

  /**
   * Get capability status
   * @param {string} tenantId
   * @returns {object}
   */
  async getCapabilityStatus(tenantId) {
    const obs = this.#context?.capabilities?.get?.('observability')
    if (!obs?.getMetrics) return {}

    const metrics = await obs.getMetrics(tenantId) || {}
    return metrics.capabilities || {}
  }

  /**
   * Get reservation metrics
   * @param {string} tenantId
   * @returns {object}
   */
  async getReservationMetrics(tenantId) {
    const business = await this.getBusinessMetrics(tenantId)
    return business.reservations || {}
  }

  /**
   * Get conversion metrics
   * @param {string} tenantId
   * @returns {object}
   */
  async getConversionMetrics(tenantId) {
    const business = await this.getBusinessMetrics(tenantId)
    return business.conversion || {}
  }

  /**
   * Get occupancy metrics
   * @param {string} tenantId
   * @returns {object}
   */
  async getOccupancyMetrics(tenantId) {
    const business = await this.getBusinessMetrics(tenantId)
    return business.occupancy || {}
  }

  /**
   * Get SEO metrics
   * @param {string} tenantId
   * @returns {object}
   */
  async getSEOMetrics(tenantId) {
    const system = await this.getSystemMetrics(tenantId)
    return system.seo || {}
  }

  /**
   * Get PWA metrics
   * @param {string} tenantId
   * @returns {object}
   */
  async getPWAMetrics(tenantId) {
    const system = await this.getSystemMetrics(tenantId)
    return system.pwa || {}
  }
}
