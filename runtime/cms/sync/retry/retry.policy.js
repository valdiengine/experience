export class RetryPolicy {
  #maxAttempts = 5
  #baseDelay = 1000
  #maxDelay = 300000
  #backoffMultiplier = 3
  #retryableErrors = ['connection', 'timeout', 'rate_limit', 'provider_unavailable']
  #deadLetterAfter = 5

  constructor(options = {}) {
    this.#maxAttempts = options.maxAttempts ?? 5
    this.#baseDelay = options.baseDelay ?? 1000
    this.#maxDelay = options.maxDelay ?? 300000
    this.#backoffMultiplier = options.backoffMultiplier ?? 3
    this.#retryableErrors = options.retryableErrors ?? this.#retryableErrors
    this.#deadLetterAfter = options.deadLetterAfter ?? 5
  }

  shouldRetry(attempt, error) {
    if (attempt >= this.#maxAttempts) return false
    if (this.#isDeadLetter(attempt)) return false
    if (this.#isRetryableError(error)) return true
    return false
  }

  getDelay(attempt) {
    const delay = this.#baseDelay * Math.pow(this.#backoffMultiplier, attempt - 1)
    return Math.min(delay, this.#maxDelay)
  }

  getJitteredDelay(attempt) {
    const delay = this.getDelay(attempt)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1)
    return Math.round(delay + jitter)
  }

  getMaxAttempts() {
    return this.#maxAttempts
  }

  getMaxDelay() {
    return this.#maxDelay
  }

  isDeadLetter(attempt) {
    return this.#isDeadLetter(attempt)
  }

  isRetryable(error) {
    return this.#isRetryableError(error)
  }

  categorizeError(error) {
    if (!error) return 'unknown'
    if (error.category === 'connection' || error.name?.includes('Connection')) return 'connection'
    if (error.category === 'timeout' || error.name?.includes('Timeout')) return 'timeout'
    if (error.category === 'rate_limit' || error.name?.includes('RateLimit')) return 'rate_limit'
    if (error.category === 'provider' || error.name?.includes('Unavailable')) return 'provider_unavailable'
    if (error.category === 'authentication' || error.name?.includes('Authentication')) return 'authentication'
    if (error.category === 'mapping' || error.name?.includes('Mapping')) return 'mapping'
    return 'permanent'
  }

  getRetrySchedule() {
    const schedule = []
    for (let i = 1; i <= this.#maxAttempts; i++) {
      schedule.push({
        attempt: i,
        delay: this.getDelay(i),
        totalDelay: schedule.reduce((sum, s) => sum + s.delay, 0) + this.getDelay(i),
      })
    }
    return schedule
  }

  #isDeadLetter(attempt) {
    return attempt >= this.#deadLetterAfter
  }

  #isRetryableError(error) {
    if (!error) return false
    const category = this.categorizeError(error)
    return this.#retryableErrors.includes(category)
  }
}

export default RetryPolicy
