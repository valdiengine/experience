/**
 * Health Monitor — System health checks for capabilities, scheduler, providers
 *
 * Business-agnostic: generic health checks, no business logic
 * Uses EventBus for status queries, DataManager for persistence
 */
import { HEALTH_STATUS, OBSERVABILITY_EVENTS } from './observability.events.js'

export class HealthMonitor {
  #context = null
  #checks = new Map()
  #lastReport = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Register a health check function
   * @param {string} name - Check name
   * @param {function} checkFn - Async function returning { status, message?, details? }
   */
  registerCheck(name, checkFn) {
    this.#checks.set(name, checkFn)
  }

  /**
   * Run all registered health checks
   * @returns {object} - { status, checks[], timestamp }
   */
  async checkSystemHealth() {
    const checks = []

    for (const [name, checkFn] of this.#checks) {
      try {
        const result = await checkFn()
        checks.push({
          name,
          status: result.status || HEALTH_STATUS.HEALTHY,
          message: result.message || 'OK',
          details: result.details || {},
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        checks.push({
          name,
          status: HEALTH_STATUS.UNHEALTHY,
          message: error.message,
          details: { error: error.message },
          timestamp: new Date().toISOString(),
        })
      }
    }

    const status = this.#aggregateStatus(checks)
    const report = {
      status,
      checks,
      timestamp: new Date().toISOString(),
    }

    this.#lastReport = report
    this.#persist(report)
    this.#emit(OBSERVABILITY_EVENTS.HEALTH_CHECKED, { report })

    if (status === HEALTH_STATUS.DEGRADED || status === HEALTH_STATUS.UNHEALTHY) {
      this.#emit(OBSERVABILITY_EVENTS.HEALTH_DEGRADED, { report })
    }

    return report
  }

  /**
   * Check capability health
   * @returns {object}
   */
  async checkCapabilityHealth() {
    const capabilities = this.#context?.capabilities
    if (!capabilities) {
      return { status: HEALTH_STATUS.UNHEALTHY, message: 'No capabilities available' }
    }

    const checks = []
    const capabilityNames = ['booking', 'reservation', 'scheduler', 'communication', 'notifications', 'availability']

    for (const name of capabilityNames) {
      const cap = capabilities.get(name)
      if (cap) {
        const isActive = cap.state === 'active'
        checks.push({
          name: `capability:${name}`,
          status: isActive ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
          message: isActive ? 'Active' : `State: ${cap.state}`,
          details: { state: cap.state, version: cap.version },
        })
      } else {
        checks.push({
          name: `capability:${name}`,
          status: HEALTH_STATUS.DEGRADED,
          message: 'Not found',
          details: {},
        })
      }
    }

    return {
      status: this.#aggregateStatus(checks),
      checks,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Check scheduler health
   * @returns {object}
   */
  async checkSchedulerHealth() {
    const scheduler = this.#context?.capabilities?.get?.('scheduler')
    if (!scheduler) {
      return { status: HEALTH_STATUS.UNHEALTHY, message: 'Scheduler not available' }
    }

    const stats = scheduler.getStats ? scheduler.getStats() : {}
    const checks = [
      {
        name: 'scheduler:jobs',
        status: HEALTH_STATUS.HEALTHY,
        message: `${stats.jobs || 0} jobs`,
        details: { jobs: stats.jobs },
      },
      {
        name: 'scheduler:executing',
        status: (stats.executing || 0) > 0 ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.HEALTHY,
        message: `${stats.executing || 0} executing`,
        details: { executing: stats.executing },
      },
    ]

    const circuitState = stats.circuitBreaker?.state
    if (circuitState === 'open') {
      checks.push({
        name: 'scheduler:circuit_breaker',
        status: HEALTH_STATUS.UNHEALTHY,
        message: 'Circuit breaker is OPEN',
        details: { state: circuitState },
      })
    } else {
      checks.push({
        name: 'scheduler:circuit_breaker',
        status: HEALTH_STATUS.HEALTHY,
        message: `Circuit breaker: ${circuitState || 'closed'}`,
        details: { state: circuitState },
      })
    }

    const failedJobs = stats.retries?.exhausted || 0
    if (failedJobs > 5) {
      checks.push({
        name: 'scheduler:failed_jobs',
        status: HEALTH_STATUS.DEGRADED,
        message: `${failedJobs} exhausted jobs`,
        details: { exhausted: failedJobs },
      })
    } else {
      checks.push({
        name: 'scheduler:failed_jobs',
        status: HEALTH_STATUS.HEALTHY,
        message: `${failedJobs} exhausted jobs`,
        details: { exhausted: failedJobs },
      })
    }

    return {
      status: this.#aggregateStatus(checks),
      checks,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get last health report
   * @returns {object|null}
   */
  getLastReport() {
    return this.#lastReport
  }

  /**
   * Get health report from persistence
   * @returns {object|null}
   */
  getHealthReport() {
    return this.#context?.dataManager?.get('observabilityHealth') || this.#lastReport
  }

  /**
   * Run all health checks and return comprehensive report
   * @returns {object}
   */
  async getFullReport() {
    const system = await this.checkSystemHealth()
    const capabilities = await this.checkCapabilityHealth()
    const scheduler = await this.checkSchedulerHealth()

    const allChecks = [
      ...system.checks,
      ...capabilities.checks,
      ...scheduler.checks,
    ]

    return {
      status: this.#aggregateStatus(allChecks),
      system: system.status,
      capabilities: capabilities.status,
      scheduler: scheduler.status,
      checks: allChecks,
      timestamp: new Date().toISOString(),
    }
  }

  // ── Private Methods ──

  #aggregateStatus(checks) {
    if (checks.some(c => c.status === HEALTH_STATUS.UNHEALTHY)) {
      return HEALTH_STATUS.UNHEALTHY
    }
    if (checks.some(c => c.status === HEALTH_STATUS.DEGRADED)) {
      return HEALTH_STATUS.DEGRADED
    }
    return HEALTH_STATUS.HEALTHY
  }

  #persist(report) {
    if (this.#context?.dataManager) {
      this.#context.dataManager.set('observabilityHealth', report)
    }
  }

  #emit(event, data) {
    this.#context?.eventBus?.emit(event, data)
  }
}
