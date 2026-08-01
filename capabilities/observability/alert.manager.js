/**
 * Alert Manager — Creates and manages system alerts
 *
 * Business-agnostic: generic alerting, no business logic
 * Uses DataManager for persistence
 * Alerts are tenant-scoped
 */
import { ALERT_SEVERITY, OBSERVABILITY_EVENTS } from './observability.events.js'
import { validateAlert } from './observability.schema.js'

export class AlertManager {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Create an alert
   * @param {object} alert - { tenantId, severity, category, message, source, metadata }
   * @returns {object} - { success, id?, errors? }
   */
  createAlert(alert) {
    const id = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const fullAlert = {
      ...alert,
      id,
      status: 'active',
      createdAt: new Date().toISOString(),
    }

    const validation = validateAlert(fullAlert)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#persist(fullAlert)
    this.#emit(OBSERVABILITY_EVENTS.ALERT_CREATED, { alert: fullAlert })

    return { success: true, id }
  }

  /**
   * Resolve an alert
   * @param {string} alertId
   * @returns {object} - { success, error? }
   */
  resolveAlert(alertId) {
    const alerts = this.#getAlerts()
    const index = alerts.findIndex(a => a.id === alertId)

    if (index === -1) {
      return { success: false, error: 'Alert not found' }
    }

    const alert = alerts[index]
    if (alert.status === 'resolved') {
      return { success: false, error: 'Alert already resolved' }
    }

    alerts[index] = {
      ...alert,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    }

    this.#persistAll(alerts)
    this.#emit(OBSERVABILITY_EVENTS.ALERT_RESOLVED, { alert: alerts[index] })

    return { success: true }
  }

  /**
   * Get all active alerts for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getActiveAlerts(tenantId) {
    const alerts = this.#getAlerts()
    return alerts.filter(a => a.tenantId === tenantId && a.status === 'active')
  }

  /**
   * Get all alerts for a tenant
   * @param {string} tenantId
   * @param {object} options - { severity, status, limit }
   * @returns {object[]}
   */
  getAlerts(tenantId, options = {}) {
    let alerts = this.#getAlerts().filter(a => a.tenantId === tenantId)

    if (options.severity) {
      alerts = alerts.filter(a => a.severity === options.severity)
    }

    if (options.status) {
      alerts = alerts.filter(a => a.status === options.status)
    }

    if (options.limit) {
      alerts = alerts.slice(-options.limit)
    }

    return alerts
  }

  /**
   * Get alert by ID
   * @param {string} alertId
   * @returns {object|null}
   */
  getAlert(alertId) {
    const alerts = this.#getAlerts()
    return alerts.find(a => a.id === alertId) || null
  }

  /**
   * Get alert counts by severity for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getAlertCounts(tenantId) {
    const alerts = this.#getAlerts().filter(a => a.tenantId === tenantId)
    return {
      active: alerts.filter(a => a.status === 'active').length,
      critical: alerts.filter(a => a.status === 'active' && a.severity === ALERT_SEVERITY.CRITICAL).length,
      warning: alerts.filter(a => a.status === 'active' && a.severity === ALERT_SEVERITY.WARNING).length,
      info: alerts.filter(a => a.status === 'active' && a.severity === ALERT_SEVERITY.INFO).length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
    }
  }

  /**
   * Resolve all alerts for a tenant
   * @param {string} tenantId
   * @returns {number} - Number of alerts resolved
   */
  resolveAll(tenantId) {
    const alerts = this.#getAlerts()
    let count = 0

    for (let i = 0; i < alerts.length; i++) {
      if (alerts[i].tenantId === tenantId && alerts[i].status === 'active') {
        alerts[i] = {
          ...alerts[i],
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
        }
        count++
      }
    }

    if (count > 0) {
      this.#persistAll(alerts)
    }

    return count
  }

  /**
   * Clean up old resolved alerts
   * @param {number} maxAge - Max age in ms (default 7 days)
   * @returns {number} - Number of alerts removed
   */
  cleanup(maxAge = 604800000) {
    const alerts = this.#getAlerts()
    const now = Date.now()
    const remaining = alerts.filter(a => {
      if (a.status === 'resolved' && a.resolvedAt) {
        const age = now - new Date(a.resolvedAt).getTime()
        return age < maxAge
      }
      return true
    })

    const removed = alerts.length - remaining.length
    if (removed > 0) {
      this.#persistAll(remaining)
    }

    return removed
  }

  // ── Private Methods ──

  #getAlerts() {
    return this.#context?.dataManager?.get('observabilityAlerts') || []
  }

  #persist(alert) {
    if (this.#context?.dataManager) {
      const alerts = this.#getAlerts()
      alerts.push(alert)
      this.#context.dataManager.set('observabilityAlerts', alerts)
    }
  }

  #persistAll(alerts) {
    if (this.#context?.dataManager) {
      this.#context.dataManager.set('observabilityAlerts', alerts)
    }
  }

  #emit(event, data) {
    this.#context?.eventBus?.emit(event, data)
  }
}
