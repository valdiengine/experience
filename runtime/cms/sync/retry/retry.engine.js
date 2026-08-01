import { RetryPolicy } from './retry.policy.js'
import { SYNC_EVENTS, createSyncEvent } from '../events/sync.events.js'
import { SyncRetryExhaustedError } from '../errors/sync.errors.js'

export class RetryEngine {
  #policy = null
  #eventBus = null
  #activeRetries = new Map()
  #deadLetterQueue = new Map()

  constructor(options = {}) {
    this.#policy = new RetryPolicy(options)
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async execute(fn, context = {}) {
    const key = context.key || `retry_${Date.now()}`
    let attempt = 1
    let lastError = null

    while (attempt <= this.#policy.getMaxAttempts()) {
      try {
        const result = await fn(attempt)
        this.#activeRetries.delete(key)
        this.#deadLetterQueue.delete(key)
        return result
      } catch (err) {
        lastError = err

        if (!this.#policy.shouldRetry(attempt, err)) {
          break
        }

        const delay = this.#policy.getJitteredDelay(attempt)

        this.#emit(SYNC_EVENTS.SYNC_RETRY, {
          key,
          attempt,
          maxAttempts: this.#policy.getMaxAttempts(),
          delay,
          error: err.message,
          category: this.#policy.categorizeError(err),
          context: this.#sanitizeContext(context),
        })

        this.#activeRetries.set(key, { attempt, delay, startedAt: Date.now() })

        await this.#wait(delay)
        attempt++
      }
    }

    this.#activeRetries.delete(key)

    if (this.#policy.isDeadLetter(attempt)) {
      this.#deadLetterQueue.set(key, {
        context,
        lastError: lastError?.message,
        attempts: attempt - 1,
        timestamp: Date.now(),
      })
    }

    this.#emit(SYNC_EVENTS.SYNC_RETRY_EXHAUSTED, {
      key,
      attempts: attempt - 1,
      lastError: lastError?.message,
      deadLetter: this.#policy.isDeadLetter(attempt),
      context: this.#sanitizeContext(context),
    })

    throw new SyncRetryExhaustedError(
      `Sync failed after ${attempt - 1} attempts: ${lastError?.message}`,
      { key, attempts: attempt - 1, lastError: lastError?.message }
    )
  }

  getActiveRetries() {
    return Array.from(this.#activeRetries.entries()).map(([key, data]) => ({
      key,
      ...data,
      elapsed: Date.now() - data.startedAt,
    }))
  }

  getDeadLetterQueue() {
    return Array.from(this.#deadLetterQueue.entries()).map(([key, data]) => ({
      key,
      ...data,
    }))
  }

  clearDeadLetter(key) {
    return this.#deadLetterQueue.delete(key)
  }

  clearAllDeadLetters() {
    this.#deadLetterQueue.clear()
  }

  getPolicy() {
    return this.#policy
  }

  reset() {
    this.#activeRetries.clear()
    this.#deadLetterQueue.clear()
  }

  #wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  #sanitizeContext(context) {
    const sanitized = { ...context }
    delete sanitized.secrets
    delete sanitized.password
    delete sanitized.token
    delete sanitized.credentials
    return sanitized
  }

  #emit(event, payload) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createSyncEvent(event, payload))
    }
  }
}

export default RetryEngine
