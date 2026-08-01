/**
 * BaseProvider — Abstract interface for data providers
 *
 * All providers must implement this interface.
 * Providers are responsible ONLY for data source communication.
 * Cache, search, filters, validation live in DataManager.
 */
export class BaseProvider {
  /**
   * Initialize the data source
   * @returns {Promise<void>}
   */
  async load() {
    throw new Error('BaseProvider.load() must be implemented')
  }

  /**
   * Get value at path
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @returns {any}
   */
  get(path) {
    throw new Error('BaseProvider.get() must be implemented')
  }

  /**
   * Set value at path
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @param {any} value - Value to set
   * @returns {any} - The set value
   */
  set(path, value) {
    throw new Error('BaseProvider.set() must be implemented')
  }

  /**
   * Update value at path using updater function
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @param {function} updater - Function that receives current value and returns new value
   * @returns {any} - The updated value
   */
  update(path, updater) {
    const current = this.get(path)
    return this.set(path, updater(current))
  }

  /**
   * Remove value at path
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @returns {boolean} - true if removed
   */
  remove(path) {
    throw new Error('BaseProvider.remove() must be implemented')
  }

  /**
   * Check if path exists
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @returns {boolean}
   */
  exists(path) {
    return this.get(path) !== undefined
  }

  /**
   * Get entire dataset
   * @returns {object}
   */
  getAll() {
    throw new Error('BaseProvider.getAll() must be implemented')
  }

  /**
   * Reload data from source
   * @returns {Promise<void>}
   */
  async refresh() {
    await this.load()
  }
}
