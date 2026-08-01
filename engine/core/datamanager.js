/**
 * DataManager — Central data access layer
 *
 * Responsibilities:
 * - Load data via Provider
 * - Maintain internal state
 * - Query data (get, filter, search)
 * - Cache management
 * - Validation & normalization
 * - Emit events on data changes
 *
 * Does NOT know about: drones, portfolio, services, reservations, etc.
 * Business logic lives in business/services/.
 */
export class DataManager {
  #provider
  #eventBus
  #state = {}
  #cache = new Map()
  #subscribers = new Map()
  #initialized = false

  /**
   * @param {BaseProvider} provider - Data provider instance
   * @param {object} eventBus - Event bus instance with on/off/emit
   */
  constructor(provider, eventBus) {
    this.#provider = provider
    this.#eventBus = eventBus
  }

  /**
   * Load data from provider
   * @returns {Promise<void>}
   */
  async load() {
    try {
      await this.#provider.load()
      this.#state = this.#provider.getAll() || {}
      this.#initialized = true
      this.#emit('data.loaded', { timestamp: Date.now() })
    } catch (error) {
      this.#emit('provider.error', { error: error.message, timestamp: Date.now() })
      throw error
    }
  }

  /**
   * Get value at path
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @returns {any}
   */
  get(path) {
    if (!path) return this.#state
    return this.#resolve(this.#state, path)
  }

  /**
   * Set value at path
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @param {any} value - Value to set
   * @returns {any} - The set value
   */
  set(path, value) {
    this.#provider.set(path, value)
    this.#resolveSet(this.#state, path, value)
    this.#invalidateCache(path)
    this.#emit('data.updated', { path, value, timestamp: Date.now() })
    this.#notify(path, value)
    return value
  }

  /**
   * Get entire dataset
   * @returns {object}
   */
  getAll() {
    return this.#state
  }

  /**
   * Filter items at path
   * @param {string} path - Path to array of items
   * @param {function} predicate - Filter function (item, index, array) => boolean
   * @returns {Array}
   */
  filter(path, predicate) {
    const items = this.get(path)
    if (!Array.isArray(items)) return []
    return items.filter(predicate)
  }

  /**
   * Search items at path
   * @param {string} path - Path to array of items
   * @param {string} query - Search query
   * @param {string[]} fields - Fields to search in
   * @returns {Array}
   */
  search(path, query, fields = []) {
    if (!query) return this.get(path) || []
    const items = this.get(path)
    if (!Array.isArray(items)) return []
    const lowerQuery = query.toLowerCase()
    return items.filter(item => {
      return fields.some(field => {
        const value = this.#resolve(item, field)
        return value != null && String(value).toLowerCase().includes(lowerQuery)
      })
    })
  }

  /**
   * Validate data against rules
   * @param {any} data - Data to validate
   * @param {object} rules - Validation rules { field: [validatorFn, ...] }
   * @returns {object} - { valid: boolean, errors: { field: string[] } }
   */
  validate(data, rules = {}) {
    const errors = {}
    let valid = true

    for (const [field, validators] of Object.entries(rules)) {
      const value = this.#resolve(data, field)
      const fieldErrors = []

      for (const validator of validators) {
        const result = validator(value)
        if (result !== true) {
          fieldErrors.push(result)
          valid = false
        }
      }

      if (fieldErrors.length) errors[field] = fieldErrors
    }

    return { valid, errors }
  }

  /**
   * Normalize data structure
   * @param {any} data - Data to normalize
   * @param {function} normalizer - Normalization function
   * @returns {any} - Normalized data
   */
  normalize(data, normalizer) {
    return normalizer(data)
  }

  /**
   * Subscribe to changes at path
   * @param {string} path - Path to subscribe to
   * @param {function} handler - Callback function
   * @returns {function} - Unsubscribe function
   */
  subscribe(path, handler) {
    if (!this.#subscribers.has(path)) this.#subscribers.set(path, new Set())
    this.#subscribers.get(path).add(handler)
    return () => this.#subscribers.get(path)?.delete(handler)
  }

  /**
   * Subscribe to DataManager events
   * @param {string} event - Event name (data.loaded, data.updated, data.changed, provider.connected, provider.error)
   * @param {function} handler - Callback function
   * @returns {function} - Unsubscribe function
   */
  on(event, handler) {
    return this.#eventBus.on(event, handler)
  }

  /**
   * Unsubscribe from DataManager events
   * @param {string} event - Event name
   * @param {function} handler - Callback function
   */
  off(event, handler) {
    this.#eventBus.off(event, handler)
  }

  /**
   * Cache management
   */
  get cache() {
    return {
      get: (key) => this.#cache.get(key),
      set: (key, value) => this.#cache.set(key, value),
      has: (key) => this.#cache.has(key),
      clear: () => this.#cache.clear(),
      delete: (key) => this.#cache.delete(key),
    }
  }

  /**
   * Provider metadata
   */
  get provider() {
    return this.#provider
  }

  /**
   * Check if DataManager is initialized
   */
  get initialized() {
    return this.#initialized
  }

  // ── Private Methods ──

  /**
   * Resolve value at path
   * @private
   */
  #resolve(obj, path) {
    const parts = typeof path === 'string' ? path.split('.') : path
    let current = obj
    for (let i = 0; i < parts.length; i++) {
      if (current == null) return undefined
      current = current[parts[i]]
    }
    return current
  }

  /**
   * Set value at path in object
   * @private
   */
  #resolveSet(obj, path, value) {
    const parts = typeof path === 'string' ? path.split('.') : path
    let current = obj
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
  }

  /**
   * Invalidate cache for path
   * @private
   */
  #invalidateCache(path) {
    const prefix = typeof path === 'string' ? path : path.join('.')
    for (const key of this.#cache.keys()) {
      if (key === prefix || key.startsWith(prefix + '.')) {
        this.#cache.delete(key)
      }
    }
  }

  /**
   * Emit event via EventBus
   * @private
   */
  #emit(event, data) {
    this.#eventBus.emit(event, data)
  }

  /**
   * Notify subscribers of path changes
   * @private
   */
  #notify(path, value) {
    const key = typeof path === 'string' ? path : path.join('.')
    this.#subscribers.get(key)?.forEach(handler => {
      try { handler(value) } catch (e) { console.error(`[DataManager:${key}]`, e) }
    })
  }
}
