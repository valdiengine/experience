export class BruteForceDetector {
  #attempts = new Map()
  #config = {}

  constructor(config = {}) {
    this.#config = {
      maxAttempts: config.maxAttempts || 5,
      windowMs: config.windowMs || 15 * 60 * 1000,
      lockoutMs: config.lockoutMs || 30 * 60 * 1000,
      ...config,
    }
  }

  get config() { return { ...this.#config } }

  recordAttempt(identifier, type = 'login') {
    const key = `${identifier}:${type}`
    const now = Date.now()
    const entry = this.#attempts.get(key) || { attempts: [], lockedUntil: null }

    if (entry.lockedUntil && now < entry.lockedUntil) {
      return { blocked: true, remainingMs: entry.lockedUntil - now }
    }

    entry.attempts = entry.attempts.filter(t => now - t < this.#config.windowMs)
    entry.attempts.push(now)
    this.#attempts.set(key, entry)

    if (entry.attempts.length >= this.#config.maxAttempts) {
      entry.lockedUntil = now + this.#config.lockoutMs
      return { blocked: true, remainingMs: this.#config.lockoutMs, reason: 'max_attempts_exceeded' }
    }

    return {
      blocked: false,
      remaining: this.#config.maxAttempts - entry.attempts.length,
      windowMs: this.#config.windowMs,
    }
  }

  isBlocked(identifier, type = 'login') {
    const key = `${identifier}:${type}`
    const entry = this.#attempts.get(key)
    if (!entry) return { blocked: false }
    if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
      return { blocked: true, remainingMs: entry.lockedUntil - Date.now() }
    }
    return { blocked: false }
  }

  reset(identifier, type = 'login') {
    const key = `${identifier}:${type}`
    this.#attempts.delete(key)
  }

  resetAll() {
    this.#attempts.clear()
  }

  status(identifier, type = 'login') {
    const key = `${identifier}:${type}`
    const entry = this.#attempts.get(key)
    if (!entry) return { attempts: 0, blocked: false }
    const now = Date.now()
    const recent = entry.attempts.filter(t => now - t < this.#config.windowMs)
    return {
      attempts: recent.length,
      maxAttempts: this.#config.maxAttempts,
      lockedUntil: entry.lockedUntil,
      blocked: entry.lockedUntil ? now < entry.lockedUntil : false,
      windowMs: this.#config.windowMs,
    }
  }
}

export default BruteForceDetector
