/**
 * Observability Capability — Production-grade monitoring foundation
 *
 * Business-agnostic: metrics, health checks, alerts from events
 * No business logic — only observation primitives
 * Consumes events via EventBus, stores via DataManager
 */
import { BaseCapability } from '../core/base.capability.js'
import { ObservabilityManager } from './observability.manager.js'
import { OBSERVABILITY_EVENTS } from './observability.events.js'

export class ObservabilityCapability extends BaseCapability {
  static id = 'observability'
  static name = 'Observability'
  static version = '1.0.0'
  static dependencies = ['scheduler']

  #manager = null
  #healthInterval = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new ObservabilityManager(context)
  }

  async activate() {
    this.#manager.start()

    this.#healthInterval = setInterval(async () => {
      await this.runHealthCheck()
    }, config().healthCheckInterval || 300000)

    this.on(OBSERVABILITY_EVENTS.ALERT_CREATED, (data) => {
      console.log(`[Observability] Alert created: ${data.alert?.severity} - ${data.alert?.message}`)
    })

    await super.activate()
  }

  async deactivate() {
    if (this.#healthInterval) {
      clearInterval(this.#healthInterval)
      this.#healthInterval = null
    }
    this.#manager.stop()
    await super.deactivate()
  }

  async destroy() {
    if (this.#healthInterval) {
      clearInterval(this.#healthInterval)
      this.#healthInterval = null
    }
    this.#manager = null
    await super.destroy()
  }

  // ── Getters ──

  get manager() { return this.#manager }

  // ── Public Methods ──

  /**
   * Get full report for a tenant
   * @param {string} tenantId
   * @returns {Promise<object>}
   */
  async getReport(tenantId) {
    return this.#manager?.getReport(tenantId) || { tenantId, health: 'unknown' }
  }

  /**
   * Check if system needs attention
   * @param {string} tenantId
   * @returns {Promise<object>}
   */
  async checkAttention(tenantId) {
    return this.#manager?.checkAttention(tenantId) || { needsAttention: false, reasons: [] }
  }

  /**
   * Run health check
   * @returns {Promise<object>}
   */
  async runHealthCheck() {
    return this.#manager?.health?.getFullReport() || { status: 'unknown' }
  }

  /**
   * Detect issues and create alerts
   * @param {string} tenantId
   * @returns {Promise<object[]>}
   */
  async detectAndAlert(tenantId) {
    return this.#manager?.detectAndAlert(tenantId) || []
  }

  /**
   * Get metrics summary for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getMetricsSummary(tenantId) {
    return this.#manager?.metrics?.getSummary(tenantId) || {}
  }

  /**
   * Get active alerts for a tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  getActiveAlerts(tenantId) {
    return this.#manager?.alerts?.getActiveAlerts(tenantId) || []
  }

  /**
   * Get alert counts for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getAlertCounts(tenantId) {
    return this.#manager?.alerts?.getAlertCounts(tenantId) || {}
  }

  /**
   * Record a custom metric
   * @param {object} metric
   * @returns {object}
   */
  recordMetric(metric) {
    return this.#manager?.metrics?.record(metric) || { success: false }
  }

  /**
   * Increment a counter
   * @param {string} tenantId
   * @param {string} category
   * @param {string} name
   * @param {number} amount
   */
  increment(tenantId, category, name, amount = 1) {
    this.#manager?.metrics?.increment(tenantId, category, name, amount)
  }
}

function config() {
  return { healthCheckInterval: 300000 }
}

export default ObservabilityCapability
