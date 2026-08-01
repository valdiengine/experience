/**
 * Lock Manager — Prevents duplicate execution of scheduled tasks
 *
 * Business-agnostic: generic resource locking via DataManager
 * Locks expire after configurable TTL
 * No direct database assumptions
 */

const DEFAULT_LOCK_TTL = 300000 // 5 minutes

export class LockManager {
  #context = null
  #lockTTL = DEFAULT_LOCK_TTL

  constructor(context, options = {}) {
    this.#context = context
    if (options.lockTTL) {
      this.#lockTTL = options.lockTTL
    }
  }

  /**
   * Acquire a lock on a resource
   * @param {string} resourceId - Resource to lock
   * @param {object} options - { ttl, owner }
   * @returns {boolean} - true if lock acquired
   */
  acquireLock(resourceId, options = {}) {
    const locks = this.#getLocks()
    const existing = locks[resourceId]
    const now = Date.now()
    const ttl = options.ttl || this.#lockTTL

    if (existing) {
      if (existing.expiresAt > now) {
        return false
      }
    }

    locks[resourceId] = {
      resourceId,
      owner: options.owner || 'system',
      acquiredAt: now,
      expiresAt: now + ttl,
    }

    this.#persistLocks(locks)
    return true
  }

  /**
   * Release a lock on a resource
   * @param {string} resourceId
   * @returns {boolean} - true if lock was released
   */
  releaseLock(resourceId) {
    const locks = this.#getLocks()
    if (!locks[resourceId]) return false

    delete locks[resourceId]
    this.#persistLocks(locks)
    return true
  }

  /**
   * Check if a resource is locked
   * @param {string} resourceId
   * @returns {boolean}
   */
  hasLock(resourceId) {
    const locks = this.#getLocks()
    const lock = locks[resourceId]
    if (!lock) return false

    if (lock.expiresAt <= Date.now()) {
      delete locks[resourceId]
      this.#persistLocks(locks)
      return false
    }

    return true
  }

  /**
   * Get lock info for a resource
   * @param {string} resourceId
   * @returns {object|null}
   */
  getLock(resourceId) {
    const locks = this.#getLocks()
    const lock = locks[resourceId]
    if (!lock) return null

    if (lock.expiresAt <= Date.now()) {
      delete locks[resourceId]
      this.#persistLocks(locks)
      return null
    }

    return { ...lock }
  }

  /**
   * Clear all expired locks
   * @returns {number} - Number of locks cleared
   */
  clearExpiredLocks() {
    const locks = this.#getLocks()
    const now = Date.now()
    let cleared = 0

    for (const [key, lock] of Object.entries(locks)) {
      if (lock.expiresAt <= now) {
        delete locks[key]
        cleared++
      }
    }

    if (cleared > 0) {
      this.#persistLocks(locks)
    }

    return cleared
  }

  /**
   * Get all active locks
   * @returns {object[]}
   */
  getAllLocks() {
    const locks = this.#getLocks()
    const now = Date.now()
    return Object.values(locks).filter(l => l.expiresAt > now)
  }

  /**
   * Force release all locks (admin use)
   * @returns {number}
   */
  clearAll() {
    const locks = this.#getLocks()
    const count = Object.keys(locks).length
    this.#persistLocks({})
    return count
  }

  // ── Private Methods ──

  /**
   * Get locks from DataManager
   * @private
   */
  #getLocks() {
    return this.#context?.dataManager?.get('schedulerLocks') || {}
  }

  /**
   * Persist locks to DataManager
   * @private
   */
  #persistLocks(locks) {
    if (this.#context?.dataManager) {
      this.#context.dataManager.set('schedulerLocks', locks)
    }
  }
}
