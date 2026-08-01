import { BaseProvider } from './base.provider.js'

/**
 * JSONProvider — Default data provider for static JSON datasets
 *
 * Responsible ONLY for data source communication.
 * Cache, search, filters, validation live in DataManager.
 */
export class JSONProvider extends BaseProvider {
  #data
  #subscribers = new Map()
  #initialized = false

  constructor(data = {}) {
    super()
    this.#data = data
  }

  /**
   * Initialize the provider with data
   * @returns {Promise<void>}
   */
  async load() {
    this.#initialized = true
    this.#emit('provider.connected', { type: 'json' })
  }

  /**
   * Get value at path
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @returns {any}
   */
  get(path) {
    if (!path) return this.#data
    const parts = typeof path === 'string' ? path.split('.') : path
    let current = this.#data
    for (let i = 0; i < parts.length; i++) {
      if (current == null) return undefined
      current = current[parts[i]]
    }
    return current
  }

  /**
   * Set value at path
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @param {any} value - Value to set
   * @returns {any} - The set value
   */
  set(path, value) {
    if (!path) {
      this.#data = value
      return value
    }
    const parts = typeof path === 'string' ? path.split('.') : path
    let current = this.#data
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
    this.#notify(path, value)
    return value
  }

  /**
   * Remove value at path
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @returns {boolean} - true if removed
   */
  remove(path) {
    if (!path) return false
    const parts = typeof path === 'string' ? path.split('.') : path
    let current = this.#data
    for (let i = 0; i < parts.length - 1; i++) {
      if (current == null || !(parts[i] in current)) return false
      current = current[parts[i]]
    }
    const key = parts[parts.length - 1]
    if (current == null || !(key in current)) return false
    delete current[key]
    this.#notify(path, undefined)
    return true
  }

  /**
   * Get entire dataset
   * @returns {object}
   */
  getAll() {
    return this.#data
  }

  /**
   * Reload data from source (no-op for static JSON)
   * @returns {Promise<void>}
   */
  async refresh() {
    // No-op for static JSON provider
    // Future: could re-fetch from API
  }

  /**
   * Subscribe to changes at path
   * @param {string|string[]} path - Path to subscribe to
   * @param {function} handler - Callback function
   * @returns {function} - Unsubscribe function
   */
  subscribe(path, handler) {
    const key = typeof path === 'string' ? path : path.join('.')
    if (!this.#subscribers.has(key)) this.#subscribers.set(key, new Set())
    this.#subscribers.get(key).add(handler)
    return () => this.#subscribers.get(key)?.delete(handler)
  }

  /**
   * Notify subscribers of changes
   * @private
   */
  #notify(path, value) {
    const key = typeof path === 'string' ? path : path.join('.')
    this.#subscribers.get(key)?.forEach(handler => {
      try { handler(value) } catch (e) { console.error(`[JSONProvider:${key}]`, e) }
    })
  }

  /**
   * Emit event to external listeners
   * @private
   */
  #emit(event, data) {
    // Emit via custom event for external consumption
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event, { detail: data }))
    }
  }

  /**
   * Get provider metadata
   * @returns {object}
   */
  get meta() {
    return {
      type: 'json',
      initialized: this.#initialized,
      hasData: this.#data != null,
    }
  }
}
