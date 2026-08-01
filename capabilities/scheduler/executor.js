/**
 * Scheduler Executor — Validates and executes scheduled jobs
 *
 * Business-agnostic: executes jobs only, no business logic
 * Prevents duplicate execution via LockManager
 * Integrates with RetryManager and CircuitBreaker
 */
import { JOB_STATUS } from './scheduler.schema.js'
import { SCHEDULER_EVENTS } from './scheduler.events.js'

export class SchedulerExecutor {
  #context = null
  #lockManager = null
  #retryManager = null
  #circuitBreaker = null
  #handlers = new Map()
  #executing = new Set()

  constructor(context, { lockManager, retryManager, circuitBreaker } = {}) {
    this.#context = context
    this.#lockManager = lockManager
    this.#retryManager = retryManager
    this.#circuitBreaker = circuitBreaker
  }

  /**
   * Register a handler function
   * @param {string} name - Handler name
   * @param {function} fn - Async handler function
   */
  registerHandler(name, fn) {
    this.#handlers.set(name, fn)
  }

  /**
   * Execute a job with full validation
   * @param {object} job - Job object
   * @returns {Promise<object>} - { success, result?, error? }
   */
  async execute(job) {
    if (!job || !job.id) {
      return { success: false, error: 'Invalid job' }
    }

    if (this.#executing.has(job.id)) {
      this.#emit(SCHEDULER_EVENTS.EXECUTION_DUPLICATE, { jobId: job.id })
      return { success: false, error: 'Already executing' }
    }

    const validation = this.#validateJob(job)
    if (!validation.valid) {
      this.#emit(SCHEDULER_EVENTS.EXECUTION_FAILED, {
        jobId: job.id,
        error: validation.error,
      })
      return { success: false, error: validation.error }
    }

    if (this.#circuitBreaker && !this.#circuitBreaker.canExecute()) {
      this.#emit(SCHEDULER_EVENTS.EXECUTION_BLOCKED, {
        jobId: job.id,
        reason: 'circuit_breaker_open',
      })
      return { success: false, error: 'Circuit breaker open' }
    }

    if (this.#lockManager) {
      const lockKey = this.#getLockKey(job)
      const locked = this.#lockManager.acquireLock(lockKey)
      if (!locked) {
        this.#emit(SCHEDULER_EVENTS.EXECUTION_DUPLICATE, { jobId: job.id })
        return { success: false, error: 'Lock acquired by another process' }
      }
    }

    this.#executing.add(job.id)
    this.#emit(SCHEDULER_EVENTS.EXECUTION_STARTED, { jobId: job.id, handler: job.handler })

    try {
      const handler = this.#handlers.get(job.handler)
      if (!handler) {
        throw new Error(`Handler not found: ${job.handler}`)
      }

      const result = await handler(job.payload || {}, job)

      if (this.#circuitBreaker) {
        this.#circuitBreaker.recordSuccess()
      }

      if (this.#retryManager) {
        this.#retryManager.resetAttempts(job.id)
      }

      this.#emit(SCHEDULER_EVENTS.EXECUTION_COMPLETED, {
        jobId: job.id,
        handler: job.handler,
      })

      return { success: true, result }
    } catch (error) {
      if (this.#circuitBreaker) {
        this.#circuitBreaker.recordFailure()
      }

      if (this.#retryManager) {
        const retryInfo = this.#retryManager.recordFailure(job)
        if (retryInfo.shouldRetry) {
          this.#emit(SCHEDULER_EVENTS.RETRY_SCHEDULED, {
            jobId: job.id,
            attempt: retryInfo.attempts,
            nextAttempt: retryInfo.nextAttempt,
          })
          return { success: false, error: error.message, retry: retryInfo }
        }
      }

      this.#emit(SCHEDULER_EVENTS.EXECUTION_FAILED, {
        jobId: job.id,
        error: error.message,
      })

      return { success: false, error: error.message }
    } finally {
      this.#executing.delete(job.id)

      if (this.#lockManager) {
        const lockKey = this.#getLockKey(job)
        this.#lockManager.releaseLock(lockKey)
      }
    }
  }

  /**
   * Execute all pending jobs that are due
   * @param {object[]} jobs - Array of job objects
   * @returns {Promise<object[]>} - Array of execution results
   */
  async executePending(jobs = []) {
    const now = new Date()
    const results = []

    for (const job of jobs) {
      if (job.status !== JOB_STATUS.PENDING) continue

      const runAt = new Date(job.runAt || job.nextRun)
      if (runAt <= now) {
        const result = await this.execute(job)
        results.push({ jobId: job.id, ...result })
      }
    }

    return results
  }

  /**
   * Execute a job by ID from a job collection
   * @param {string} jobId
   * @param {object[]} jobs - Array of job objects to search
   * @returns {Promise<object>}
   */
  async executeById(jobId, jobs = []) {
    const job = jobs.find(j => j.id === jobId)
    if (!job) {
      return { success: false, error: 'Job not found' }
    }
    return this.execute(job)
  }

  /**
   * Cancel execution of a job
   * @param {string} jobId
   * @returns {{ success: boolean }}
   */
  cancel(jobId) {
    this.#executing.delete(jobId)

    if (this.#lockManager) {
      this.#lockManager.releaseLock(`job:${jobId}`)
    }

    this.#emit(SCHEDULER_EVENTS.JOB_CANCELLED, { jobId })
    return { success: true }
  }

  /**
   * Retry a failed job
   * @param {string} jobId
   * @param {object[]} jobs - Array of job objects
   * @returns {Promise<object>}
   */
  async retry(jobId, jobs = []) {
    const job = jobs.find(j => j.id === jobId)
    if (!job) {
      return { success: false, error: 'Job not found' }
    }

    if (job.status !== JOB_STATUS.FAILED) {
      return { success: false, error: 'Job is not in failed state' }
    }

    const retryJob = { ...job, status: JOB_STATUS.PENDING, retries: 0 }
    return this.execute(retryJob)
  }

  /**
   * Get execution status
   * @param {string} jobId
   * @returns {{ executing: boolean }}
   */
  getStatus(jobId) {
    return {
      executing: this.#executing.has(jobId),
    }
  }

  /**
   * Check if a job is currently executing
   * @param {string} jobId
   * @returns {boolean}
   */
  isExecuting(jobId) {
    return this.#executing.has(jobId)
  }

  /**
   * Get count of executing jobs
   * @returns {number}
   */
  get executingCount() {
    return this.#executing.size
  }

  // ── Private Methods ──

  /**
   * Validate job before execution
   * @private
   */
  #validateJob(job) {
    if (!job.id) return { valid: false, error: 'Missing job id' }
    if (!job.handler) return { valid: false, error: 'Missing job handler' }
    if (job.status === JOB_STATUS.CANCELLED) return { valid: false, error: 'Job is cancelled' }
    return { valid: true }
  }

  /**
   * Generate lock key for a job
   * @private
   */
  #getLockKey(job) {
    const resource = job.payload?.reservationId || job.payload?.resourceId || job.id
    return `job:${resource}`
  }

  /**
   * Emit event
   * @private
   */
  #emit(eventName, data) {
    if (this.#context?.eventBus) {
      this.#context.eventBus.emit(eventName, data)
    }
  }
}
