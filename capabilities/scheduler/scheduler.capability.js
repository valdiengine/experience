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
    // BOOKING-EXPIRATION-TIMERS-1. Cancelling used to reach only the executor,
    // which knows nothing about the job collection: it cleared in-flight state
    // and returned `{ success: true }` while the stored job stayed `pending` and
    // a later tick still ran it. The stored job is now cancelled too, so a
    // "cancelled" cancellation is one the scheduler agrees with.
    const stored = this.#manager?.cancel?.(jobId)
    const execution = this.#executor?.cancel(jobId) || { success: false }

    if (stored?.success === true) return stored
    return execution
  }

  /**
   * Register a handler for a job name. The last registration wins, so a name
   * must identify exactly one owner — a shared fixed name lets a second
   * registration silently replace the first.
   * @param {string} name - Handler name
   * @param {function} fn - Handler function
   */
  registerHandler(name, fn) {
    this.#executor?.registerHandler(name, fn)
    this.#manager?.registerHandler(name, fn)
  }

  /**
   * Remove a handler registration from both registries, so a job left over from a
   * destroyed capability resolves as "handler not found" instead of running
   * against a detached instance.
   * @param {string} name - Handler name
   * @returns {{ success: boolean }}
   */
  unregisterHandler(name) {
    this.#executor?.unregisterHandler(name)
    this.#manager?.unregisterHandler(name)
    return { success: true }
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

  runCleanup() {
    const result = this.#cleanupManager?.runAll() || { totalCleaned: 0 }
    // Pre-existing defect found while wiring BOOKING-EXPIRATION-TIMERS-1: this
    // referenced `this.#context`, a private field that only `BaseCapability`
    // declares. It is a SyntaxError at module compile time, which made
    // `capabilities/core/register.js` — and therefore the whole capability
    // registry — unloadable. The public `context` getter is the intended accessor.
    this.context?.eventBus?.emit(SCHEDULER_EVENTS.CLEANUP_COMPLETED, result)
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
