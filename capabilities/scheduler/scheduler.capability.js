/**
 * Scheduler Capability — Generic scheduling layer
 *
 * Business-agnostic: provides delayed execution, recurring jobs, expiration checks
 * No business logic — only scheduling primitives
 * Includes: Executor, LockManager, RetryManager, CircuitBreaker, CleanupManager
 */
import { BaseCapability } from '../core/base.capability.js'
import { SchedulerManager } from './scheduler.manager.js'
import { SchedulerExecutor } from './executor.js'
import { LockManager } from './lock.manager.js'
import { RetryManager } from './retry.manager.js'
import { CircuitBreaker } from './circuit.breaker.js'
import { CleanupManager } from './cleanup.manager.js'
import { SCHEDULER_EVENTS } from './scheduler.events.js'

export class SchedulerCapability extends BaseCapability {
  static id = 'scheduler'
  static name = 'Scheduler'
  static version = '2.0.0'
  static dependencies = []

  #manager = null
  #executor = null
  #lockManager = null
  #retryManager = null
  #circuitBreaker = null
  #cleanupManager = null
  #tickInterval = null
  #cleanupInterval = null

  async init(context, config = {}) {
    await super.init(context, config)

    this.#lockManager = new LockManager(context, {
      lockTTL: config.lockTTL || 300000,
    })

    this.#retryManager = new RetryManager(context, {
      maxAttempts: config.maxRetryAttempts || 3,
      baseDelay: config.retryBaseDelay || 1000,
      maxDelay: config.retryMaxDelay || 300000,
    })

    this.#circuitBreaker = new CircuitBreaker(context, {
      failureThreshold: config.circuitBreakerThreshold || 5,
      recoveryTimeout: config.circuitBreakerRecovery || 60000,
      name: 'scheduler',
    })

    this.#cleanupManager = new CleanupManager(context, {
      lockTTL: config.lockTTL || 300000,
      jobMaxAge: config.jobMaxAge || 86400000,
      logMaxAge: config.logMaxAge || 604800000,
    })

    this.#manager = new SchedulerManager(context)

    this.#executor = new SchedulerExecutor(context, {
      lockManager: this.#lockManager,
      retryManager: this.#retryManager,
      circuitBreaker: this.#circuitBreaker,
    })
  }

  async activate() {
    this.#retryManager.loadFromDataManager()
    this.#manager.loadFromDataManager()

    this.#tickInterval = setInterval(() => {
      this.#manager.tick()
    }, 60000)

    this.#cleanupInterval = setInterval(() => {
      this.runCleanup()
    }, 300000)

    await super.activate()
  }

  async deactivate() {
    if (this.#tickInterval) {
      clearInterval(this.#tickInterval)
      this.#tickInterval = null
    }
    if (this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval)
      this.#cleanupInterval = null
    }
    await super.deactivate()
  }

  async destroy() {
    if (this.#tickInterval) {
      clearInterval(this.#tickInterval)
      this.#tickInterval = null
    }
    if (this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval)
      this.#cleanupInterval = null
    }
    this.#manager = null
    this.#executor = null
    this.#lockManager = null
    this.#retryManager = null
    this.#circuitBreaker = null
    this.#cleanupManager = null
    await super.destroy()
  }

  // ── Getters ──

  get manager() { return this.#manager }
  get executor() { return this.#executor }
  get lockManager() { return this.#lockManager }
  get retryManager() { return this.#retryManager }
  get circuitBreaker() { return this.#circuitBreaker }
  get cleanupManager() { return this.#cleanupManager }

  // ── Public Methods ──

  async schedule(jobDef) {
    return this.#manager?.schedule(jobDef) || { success: false, error: 'Manager not initialized' }
  }

  async cancel(jobId) {
    return this.#executor?.cancel(jobId) || { success: false }
  }

  async run(jobId) {
    const job = this.#manager?.getJob(jobId)
    if (!job) return { success: false, error: 'Job not found' }
    return this.#executor?.execute(job) || { success: false }
  }

  async executeJob(job) {
    return this.#executor?.execute(job) || { success: false }
  }

  async executePending() {
    const jobs = this.#manager?.getJobs() || []
    return this.#executor?.executePending(jobs) || []
  }

  getJobs() {
    return this.#manager?.getJobs() || []
  }

  async remove(jobId) {
    return this.#manager?.remove(jobId) || { success: false }
  }

  registerHandler(name, fn) {
    this.#executor?.registerHandler(name, fn)
    this.#manager?.registerHandler(name, fn)
  }

  runCleanup() {
    const result = this.#cleanupManager?.runAll() || { totalCleaned: 0 }
    this.#context?.eventBus?.emit(SCHEDULER_EVENTS.CLEANUP_COMPLETED, result)
    return result
  }

  acquireLock(resourceId, options) {
    return this.#lockManager?.acquireLock(resourceId, options) || false
  }

  releaseLock(resourceId) {
    return this.#lockManager?.releaseLock(resourceId) || false
  }

  canExecute() {
    return this.#circuitBreaker?.canExecute() ?? true
  }

  getRetryInfo(jobId) {
    return this.#retryManager?.getRetryInfo(jobId) || null
  }

  getStats() {
    return {
      jobs: this.#manager?.getJobs().length || 0,
      locks: this.#lockManager?.getAllLocks().length || 0,
      retries: this.#retryManager?.getStats() || {},
      circuitBreaker: this.#circuitBreaker?.getState() || {},
      executing: this.#executor?.executingCount || 0,
    }
  }
}

export default SchedulerCapability
