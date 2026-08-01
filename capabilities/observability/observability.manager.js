/**
 * Observability Manager — Orchestrates metrics, health, and alerts
 *
 * Business-agnostic: coordinates sub-modules, no business logic
 * Uses DataManager for persistence
 */
import { MetricsCollector } from './metrics.collector.js'
import { HealthMonitor } from './health.monitor.js'
import { AlertManager } from './alert.manager.js'
import { METRIC_CATEGORY, ALERT_SEVERITY } from './observability.schema.js'
import { HEALTH_STATUS } from './observability.events.js'

export class ObservabilityManager {
  #context = null
  #metricsCollector = null
  #healthMonitor = null
  #alertManager = null

  constructor(context) {
    this.#context = context
    this.#metricsCollector = new MetricsCollector(context)
    this.#healthMonitor = new HealthMonitor(context)
    this.#alertManager = new AlertManager(context)
  }

  // ── Getters ──

  get metrics() { return this.#metricsCollector }
  get health() { return this.#healthMonitor }
  get alerts() { return this.#alertManager }

  // ── Lifecycle ──

  start() {
    this.#metricsCollector.start()
    this.#registerDefaultHealthChecks()
  }

  stop() {
    this.#metricsCollector.stop()
  }

  // ── Convenience Methods ──

  /**
   * Get full observability report for a tenant
   * @param {string} tenantId
   * @returns {Promise<object>}
   */
  async getReport(tenantId) {
    const health = await this.#healthMonitor.getFullReport()
    const metrics = this.#metricsCollector.getSummary(tenantId)
    const alertCounts = this.#alertManager.getAlertCounts(tenantId)

    return {
      tenantId,
      health: health.status,
      healthDetails: health,
      metrics,
      alerts: alertCounts,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Check if system needs attention
   * @param {string} tenantId
   * @returns {object} - { needsAttention, reasons[] }
   */
  async checkAttention(tenantId) {
    const reasons = []

    const health = await this.#healthMonitor.getFullReport()
    if (health.status !== HEALTH_STATUS.HEALTHY) {
      reasons.push(`System health: ${health.status}`)
    }

    const alertCounts = this.#alertManager.getAlertCounts(tenantId)
    if (alertCounts.critical > 0) {
      reasons.push(`${alertCounts.critical} critical alerts`)
    }
    if (alertCounts.warning > 3) {
      reasons.push(`${alertCounts.warning} warning alerts`)
    }

    const schedulerHealth = await this.#healthMonitor.checkSchedulerHealth()
    if (schedulerHealth.status !== HEALTH_STATUS.HEALTHY) {
      reasons.push('Scheduler issues detected')
    }

    return {
      needsAttention: reasons.length > 0,
      reasons,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Auto-detect issues and create alerts
   * @param {string} tenantId
   * @returns {object[]} - Created alerts
   */
  async detectAndAlert(tenantId) {
    const created = []

    const health = await this.#healthMonitor.getFullReport()
    if (health.status === HEALTH_STATUS.UNHEALTHY) {
      const result = this.#alertManager.createAlert({
        tenantId,
        severity: ALERT_SEVERITY.CRITICAL,
        category: 'system',
        message: `System health is unhealthy: ${health.checks.filter(c => c.status === 'unhealthy').map(c => c.name).join(', ')}`,
        source: 'health_monitor',
      })
      if (result.success) created.push(result)
    }

    const metrics = this.#metricsCollector.getSummary(tenantId)
    const totalRes = metrics.reservation.created
    const expiredRes = metrics.reservation.expired
    if (totalRes > 10 && expiredRes / totalRes > 0.3) {
      const result = this.#alertManager.createAlert({
        tenantId,
        severity: ALERT_SEVERITY.WARNING,
        category: 'reservation',
        message: `High expiration rate: ${expiredRes}/${totalRes} reservations expired`,
        source: 'metrics_collector',
      })
      if (result.success) created.push(result)
    }

    const failedNotif = metrics.notification.failed
    if (failedNotif > 5) {
      const result = this.#alertManager.createAlert({
        tenantId,
        severity: ALERT_SEVERITY.WARNING,
        category: 'notification',
        message: `${failedNotif} failed notifications`,
        source: 'metrics_collector',
      })
      if (result.success) created.push(result)
    }

    const failedScheduler = metrics.scheduler.failed
    if (failedScheduler > 10) {
      const result = this.#alertManager.createAlert({
        tenantId,
        severity: ALERT_SEVERITY.CRITICAL,
        category: 'scheduler',
        message: `${failedScheduler} failed scheduler jobs`,
        source: 'metrics_collector',
      })
      if (result.success) created.push(result)
    }

    return created
  }

  // ── Private Methods ──

  #registerDefaultHealthChecks() {
    this.#healthMonitor.registerCheck('system:capabilities', async () => {
      const health = await this.#healthMonitor.checkCapabilityHealth()
      return { status: health.status, message: `Capabilities: ${health.status}` }
    })

    this.#healthMonitor.registerCheck('system:scheduler', async () => {
      const health = await this.#healthMonitor.checkSchedulerHealth()
      return { status: health.status, message: `Scheduler: ${health.status}` }
    })

    this.#healthMonitor.registerCheck('system:datamanager', async () => {
      const hasDM = !!this.#context?.dataManager
      return {
        status: hasDM ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNHEALTHY,
        message: hasDM ? 'DataManager available' : 'DataManager missing',
      }
    })

    this.#healthMonitor.registerCheck('system:eventbus', async () => {
      const hasEB = !!this.#context?.eventBus
      return {
        status: hasEB ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNHEALTHY,
        message: hasEB ? 'EventBus available' : 'EventBus missing',
      }
    })
  }
}
