/**
 * Circuit Breaker — Prevents repeated failures from damaging the system
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Temporarily blocks execution after consecutive failures
 * - HALF_OPEN: Tests recovery with limited requests
 *
 * Business-agnostic: generic failure protection, no business logic
 */

const BREAKER_STATE = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open',
}

const DEFAULT_FAILURE_THRESHOLD = 5
const DEFAULT_RECOVERY_TIMEOUT = 60000
const DEFAULT_SUCCESS_THRESHOLD = 2

export class CircuitBreaker {
  #context = null
  #state = BREAKER_STATE.CLOSED
  #failureCount = 0
  #successCount = 0
  #lastFailureTime = null
  #failureThreshold = DEFAULT_FAILURE_THRESHOLD
  #recoveryTimeout = DEFAULT_RECOVERY_TIMEOUT
  #successThreshold = DEFAULT_SUCCESS_THRESHOLD
  #name = 'default'

  constructor(context, options = {}) {
    this.#context = context
    if (options.failureThreshold) this.#failureThreshold = options.failureThreshold
    if (options.recoveryTimeout) this.#recoveryTimeout = options.recoveryTimeout
    if (options.successThreshold) this.#successThreshold = options.successThreshold
    if (options.name) this.#name = options.name
  }

  /**
   * Check if execution is allowed
   * @returns {boolean}
   */
  canExecute() {
    if (this.#state === BREAKER_STATE.CLOSED) {
      return true
    }

    if (this.#state === BREAKER_STATE.OPEN) {
      if (this.#shouldAttemptRecovery()) {
        this.#state = BREAKER_STATE.HALF_OPEN
        this.#successCount = 0
        this.#emitEvent('circuit_breaker:half_open', { name: this.#name })
        return true
      }
      return false
    }

    if (this.#state === BREAKER_STATE.HALF_OPEN) {
      return true
    }

    return false
  }

  /**
   * Record a successful execution
   */
  recordSuccess() {
    if (this.#state === BREAKER_STATE.HALF_OPEN) {
      this.#successCount++
      if (this.#successCount >= this.#successThreshold) {
        this.#reset()
        this.#emitEvent('circuit_breaker:closed', { name: this.#name })
      }
    } else {
      this.#failureCount = 0
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure() {
    this.#failureCount++
    this.#lastFailureTime = Date.now()

    if (this.#state === BREAKER_STATE.HALF_OPEN) {
      this.#open()
    } else if (this.#failureCount >= this.#failureThreshold) {
      this.#open()
    }
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset() {
    this.#reset()
    this.#emitEvent('circuit_breaker:reset', { name: this.#name })
  }

  /**
   * Get current breaker state
   * @returns {object}
   */
  getState() {
    return {
      name: this.#name,
      state: this.#state,
      failureCount: this.#failureCount,
      successCount: this.#successCount,
      lastFailureTime: this.#lastFailureTime,
      failureThreshold: this.#failureThreshold,
      recoveryTimeout: this.#recoveryTimeout,
    }
  }

  /**
   * Get current state name
   * @returns {string}
   */
  get state() {
    return this.#state
  }

  // ── Private Methods ──

  /**
   * Transition to OPEN state
   * @private
   */
  #open() {
    this.#state = BREAKER_STATE.OPEN
    this.#lastFailureTime = Date.now()
    this.#emitEvent('circuit_breaker:open', {
      name: this.#name,
      failureCount: this.#failureCount,
    })
  }

  /**
   * Reset to CLOSED state
   * @private
   */
  #reset() {
    this.#state = BREAKER_STATE.CLOSED
    this.#failureCount = 0
    this.#successCount = 0
    this.#lastFailureTime = null
  }

  /**
   * Check if recovery should be attempted
   * @private
   */
  #shouldAttemptRecovery() {
    if (!this.#lastFailureTime) return false
    return Date.now() - this.#lastFailureTime >= this.#recoveryTimeout
  }

  /**
   * Emit event
   * @private
   */
  #emitEvent(eventName, data) {
    if (this.#context?.eventBus) {
      this.#context.eventBus.emit(eventName, data)
    }
  }
}

export { BREAKER_STATE }
