/**
 * Retry Manager — Handles job retry logic with exponential backoff
 *
 * Business-agnostic: generic retry strategy, no business logic
 * Tracks attempts, calculates backoff, manages failed state
 */
import { JOB_STATUS } from './scheduler.schema.js'
import { SCHEDULER_EVENTS } from './scheduler.events.js'

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BASE_DELAY = 1000
const DEFAULT_MAX_DELAY = 300000

export class RetryManager {
  #context = null
  #retryData = new Map()
  #maxAttempts = DEFAULT_MAX_ATTEMPTS
  #baseDelay = DEFAULT_BASE_DELAY
  #maxDelay = DEFAULT_MAX_DELAY

  constructor(context, options = {}) {
    this.#context = context
    if (options.maxAttempts) this.#maxAttempts = options.maxAttempts
    if (options.baseDelay) this.#baseDelay = options.baseDelay
    if (options.maxDelay) this.#maxDelay = options.maxDelay
  }

  /**
   * Record a failure and determine if retry should occur
   * @param {object} job - Job object
   * @returns {object} - { shouldRetry, attempts, nextAttempt, maxAttempts }
   */
  recordFailure(job) {
    const current = this.#retryData.get(job.id) || {
      jobId: job.id,
      attempts: 0,
      maxAttempts: job.maxRetries || this.#maxAttempts,
      lastAttempt: null,
      nextAttempt: null,
      status: 'pending',
    }

    current.attempts++
    current.lastAttempt = Date.now()
    current.status = 'failed'

    const shouldRetry = current.attempts < current.maxAttempts

    if (shouldRetry) {
      const delay = this.#calculateBackoff(current.attempts)
      current.nextAttempt = Date.now() + delay
      current.status = 'retry_scheduled'
    } else {
      current.status = 'exhausted'
    }

    this.#retryData.set(job.id, current)
    this.#persist()

    return {
      shouldRetry,
      attempts: current.attempts,
      maxAttempts: current.maxAttempts,
      nextAttempt: current.nextAttempt,
      status: current.status,
    }
  }

  /**
   * Reset retry attempts for a job (on success)
   * @param {string} jobId
   */
  resetAttempts(jobId) {
    this.#retryData.delete(jobId)
    this.#persist()
  }

  /**
   * Get retry info for a job
   * @param {string} jobId
   * @returns {object|null}
   */
  getRetryInfo(jobId) {
    return this.#retryData.get(jobId) || null
  }

  /**
   * Get all jobs with pending retries
   * @returns {object[]}
   */
  getPendingRetries() {
    const now = Date.now()
    return Array.from(this.#retryData.values()).filter(
      r => r.status === 'retry_scheduled' && r.nextAttempt <= now
    )
  }

  /**
   * Get retry statistics
   * @returns {object}
   */
  getStats() {
    const all = Array.from(this.#retryData.values())
    return {
      total: all.length,
      pending: all.filter(r => r.status === 'retry_scheduled').length,
      exhausted: all.filter(r => r.status === 'exhausted').length,
      failed: all.filter(r => r.status === 'failed').length,
    }
  }

  /**
   * Check if a job has exceeded max attempts
   * @param {string} jobId
   * @returns {boolean}
   */
  isExhausted(jobId) {
    const info = this.#retryData.get(jobId)
    return info?.status === 'exhausted'
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attempt - Current attempt number (1-based)
   * @returns {number} - Delay in milliseconds
   * @private
   */
  #calculateBackoff(attempt) {
    const delay = this.#baseDelay * Math.pow(2, attempt - 1)
    return Math.min(delay, this.#maxDelay)
  }

  /**
   * Persist retry data
   * @private
   */
  #persist() {
    if (this.#context?.dataManager) {
      const data = Array.from(this.#retryData.values())
      this.#context.dataManager.set('schedulerRetries', data)
    }
  }

  /**
   * Load retry data from DataManager
   */
  loadFromDataManager() {
    const data = this.#context?.dataManager?.get('schedulerRetries') || []
    for (const item of data) {
      this.#retryData.set(item.jobId, item)
    }
  }
}
