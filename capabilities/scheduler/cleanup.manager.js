/**
 * Cleanup Manager — Removes expired locks, completed jobs, obsolete logs
 *
 * Business-agnostic: generic cleanup, no business logic
 * Tenant-aware: operates within tenant scope
 * Uses DataManager for all data access
 */

const DEFAULT_LOCK_TTL = 300000
const DEFAULT_JOB_MAX_AGE = 86400000
const DEFAULT_LOG_MAX_AGE = 604800000

export class CleanupManager {
  #context = null
  #lockTTL = DEFAULT_LOCK_TTL
  #jobMaxAge = DEFAULT_JOB_MAX_AGE
  #logMaxAge = DEFAULT_LOG_MAX_AGE

  constructor(context, options = {}) {
    this.#context = context
    if (options.lockTTL) this.#lockTTL = options.lockTTL
    if (options.jobMaxAge) this.#jobMaxAge = options.jobMaxAge
    if (options.logMaxAge) this.#logMaxAge = options.logMaxAge
  }

  /**
   * Clean up expired locks
   * @returns {{ cleaned: number, remaining: number }}
   */
  cleanupLocks() {
    const locks = this.#context?.dataManager?.get('schedulerLocks') || {}
    const now = Date.now()
    let cleaned = 0
    const remaining = {}

    for (const [key, lock] of Object.entries(locks)) {
      if (lock.expiresAt && lock.expiresAt > now) {
        remaining[key] = lock
      } else {
        cleaned++
      }
    }

    if (cleaned > 0 && this.#context?.dataManager) {
      this.#context.dataManager.set('schedulerLocks', remaining)
    }

    return { cleaned, remaining: Object.keys(remaining).length }
  }

  /**
   * Clean up completed and old jobs
   * @returns {{ cleaned: number, remaining: number }}
   */
  cleanupJobs() {
    const jobs = this.#context?.dataManager?.get('schedulerJobs') || []
    const now = Date.now()
    const maxAge = this.#jobMaxAge

    const remaining = jobs.filter(job => {
      if (job.status === 'completed' || job.status === 'cancelled') {
        const age = now - new Date(job.createdAt).getTime()
        return age < maxAge
      }
      if (job.status === 'failed') {
        const age = now - new Date(job.createdAt).getTime()
        return age < maxAge * 2
      }
      return true
    })

    const cleaned = jobs.length - remaining.length

    if (cleaned > 0 && this.#context?.dataManager) {
      this.#context.dataManager.set('schedulerJobs', remaining)
    }

    return { cleaned, remaining: remaining.length }
  }

  /**
   * Clean up obsolete execution logs
   * @returns {{ cleaned: number, remaining: number }}
   */
  cleanupLogs() {
    const logs = this.#context?.dataManager?.get('schedulerLogs') || []
    const now = Date.now()
    const maxAge = this.#logMaxAge

    const remaining = logs.filter(log => {
      const age = now - new Date(log.timestamp).getTime()
      return age < maxAge
    })

    const cleaned = logs.length - remaining.length

    if (cleaned > 0 && this.#context?.dataManager) {
      this.#context.dataManager.set('schedulerLogs', remaining)
    }

    return { cleaned, remaining: remaining.length }
  }

  /**
   * Run all cleanup operations
   * @returns {object}
   */
  runAll() {
    const locks = this.cleanupLocks()
    const jobs = this.cleanupJobs()
    const logs = this.cleanupLogs()

    return {
      locks,
      jobs,
      logs,
      totalCleaned: locks.cleaned + jobs.cleaned + logs.cleaned,
    }
  }

  /**
   * Run cleanup for a specific tenant
   * @param {string} tenantId
   * @returns {object}
   */
  runForTenant(tenantId) {
    const locks = this.#cleanupTenantLocks(tenantId)
    const jobs = this.#cleanupTenantJobs(tenantId)
    const logs = this.#cleanupTenantLogs(tenantId)

    return {
      locks,
      jobs,
      logs,
      totalCleaned: locks.cleaned + jobs.cleaned + logs.cleaned,
    }
  }

  // ── Private Methods ──

  /**
   * Clean up locks for a specific tenant
   * @private
   */
  #cleanupTenantLocks(tenantId) {
    const locks = this.#context?.dataManager?.get('schedulerLocks') || {}
    const now = Date.now()
    let cleaned = 0
    const remaining = {}

    for (const [key, lock] of Object.entries(locks)) {
      const isTenantLock = key.includes(`tenant:${tenantId}`) || lock.owner === `tenant:${tenantId}`
      const isExpired = lock.expiresAt && lock.expiresAt <= now

      if (isTenantLock && isExpired) {
        cleaned++
      } else {
        remaining[key] = lock
      }
    }

    if (cleaned > 0 && this.#context?.dataManager) {
      this.#context.dataManager.set('schedulerLocks', remaining)
    }

    return { cleaned, remaining: Object.keys(remaining).length }
  }

  /**
   * Clean up jobs for a specific tenant
   * @private
   */
  #cleanupTenantJobs(tenantId) {
    const jobs = this.#context?.dataManager?.get('schedulerJobs') || []
    const now = Date.now()

    const remaining = jobs.filter(job => {
      if (job.tenantId !== tenantId) return true
      if (job.status === 'completed' || job.status === 'cancelled') {
        const age = now - new Date(job.createdAt).getTime()
        return age < this.#jobMaxAge
      }
      return true
    })

    const cleaned = jobs.length - remaining.length

    if (cleaned > 0 && this.#context?.dataManager) {
      this.#context.dataManager.set('schedulerJobs', remaining)
    }

    return { cleaned, remaining: remaining.length }
  }

  /**
   * Clean up logs for a specific tenant
   * @private
   */
  #cleanupTenantLogs(tenantId) {
    const logs = this.#context?.dataManager?.get('schedulerLogs') || []
    const now = Date.now()

    const remaining = logs.filter(log => {
      if (log.tenantId !== tenantId) return true
      const age = now - new Date(log.timestamp).getTime()
      return age < this.#logMaxAge
    })

    const cleaned = logs.length - remaining.length

    if (cleaned > 0 && this.#context?.dataManager) {
      this.#context.dataManager.set('schedulerLogs', remaining)
    }

    return { cleaned, remaining: remaining.length }
  }
}
