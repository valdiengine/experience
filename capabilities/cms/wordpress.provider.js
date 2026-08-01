/**
 * WordPress Provider â€” REST API data source
 *
 * Fetches content from WordPress REST API.
 * Business-agnostic: only handles pages, posts, media, metadata.
 *
 * Prepared for future: RESTProvider, GraphQLProvider, DatabaseProvider
 */
import { BaseProvider } from '../../engine/providers/base.provider.js'

export class WordPressProvider extends BaseProvider {
  #baseUrl
  #data = {}
  #initialized = false
  #cache = new Map()

  /**
   * @param {object} config - WordPress configuration
   * @param {string} config.baseUrl - WordPress site URL (e.g., https://example.com)
   * @param {string} [config.apiPrefix] - REST API prefix (default: /wp-json/wp/v2)
   */
  constructor(config = {}) {
    super()
    this.#baseUrl = (config.baseUrl || '').replace(/\/$/, '')
    this.#config = config
  }

  #config = {}

  /**
   * Load content from WordPress REST API
   * @returns {Promise<void>}
   */
  async load() {
    try {
      const [pages, posts] = await Promise.all([
        this.#fetch('/pages'),
        this.#fetch('/posts'),
      ])

      this.#data = {
        pages: pages || [],
        posts: posts || [],
        media: [],
      }

      this.#initialized = true
    } catch (error) {
      console.error('[WordPressProvider] Load failed:', error.message)
      this.#data = { pages: [], posts: [], media: [] }
      this.#initialized = true
    }
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
   * Set value at path (local cache)
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @param {any} value - Value to set
   * @returns {any}
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
    return value
  }

  /**
   * Remove value at path
   * @param {string|string[]} path - Dot-separated path or array of keys
   * @returns {boolean}
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
   * Search content by query
   * @param {string} query - Search query
   * @param {string[]} fields - Fields to search in
   * @returns {object[]}
   */
  search(query, fields = ['title', 'content', 'excerpt']) {
    if (!query) return []
    const lowerQuery = query.toLowerCase()
    const allContent = [...(this.#data.pages || []), ...(this.#data.posts || [])]

    return allContent.filter(item => {
      return fields.some(field => {
        const value = item[field]
        return value != null && String(value).toLowerCase().includes(lowerQuery)
      })
    })
  }

  /**
   * Filter content by predicate
   * @param {string} contentType - 'pages' or 'posts'
   * @param {function} predicate - Filter function
   * @returns {object[]}
   */
  filter(contentType, predicate) {
    const items = this.#data[contentType] || []
    return items.filter(predicate)
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {any}
   */
  cacheGet(key) {
    return this.#cache.get(key)
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  cacheSet(key, value) {
    this.#cache.set(key, value)
  }

  /**
   * Clear cache
   */
  cacheClear() {
    this.#cache.clear()
  }

  /**
   * Refresh data from WordPress
   * @returns {Promise<void>}
   */
  async refresh() {
    this.cacheClear()
    await this.load()
  }

  /**
   * Fetch from WordPress REST API
   * @private
   * @param {string} endpoint - API endpoint
   * @returns {Promise<object[]>}
   */
  async #fetch(endpoint) {
    const url = `${this.#baseUrl}/wp-json/wp/v2${endpoint}?per_page=100`

    if (typeof fetch === 'undefined') {
      console.warn('[WordPressProvider] fetch not available, returning empty array')
      return []
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get provider metadata
   */
  get meta() {
    return {
      type: 'wordpress',
      baseUrl: this.#baseUrl,
      initialized: this.#initialized,
      pageCount: this.#data.pages?.length || 0,
      postCount: this.#data.posts?.length || 0,
    }
  }
}
