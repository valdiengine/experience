import { WordPressAuth } from './wordpress.auth.js'
import { WordPressRequest } from './wordpress.request.js'

const WP_API_NAMESPACE = 'wp/v2'

export class WordPressClient {
  #baseUrl = null
  #auth = null
  #request = null
  #siteInfo = null
  #connected = false
  #eventBus = null

  constructor(config = {}) {
    this.#baseUrl = this.#normalizeUrl(config.siteUrl || config.url || '')
    this.#auth = new WordPressAuth(config)
    this.#request = new WordPressRequest(config)
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async connect(secrets) {
    await this.#auth.initialize(secrets)
    this.#siteInfo = await this.#request.get(`${this.#baseUrl}/wp-json/`, this.#auth.getAuthHeaders())
    this.#connected = true
    return this.#siteInfo
  }

  disconnect() {
    this.#connected = false
    this.#siteInfo = null
  }

  get connected() {
    return this.#connected
  }

  get baseUrl() {
    return this.#baseUrl
  }

  get siteInfo() {
    return this.#siteInfo
  }

  get authMethod() {
    return this.#auth.method
  }

  async contentGet(type, id, options = {}) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/${type}/${id}`
    const params = this.#buildQueryParams(options)
    return this.#request.get(`${endpoint}${params}`, this.#auth.getAuthHeaders())
  }

  async contentQuery(type, filters = {}, pagination = {}) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/${type}`
    const params = this.#buildQueryParams({ ...filters, ...pagination })
    return this.#request.get(`${endpoint}${params}`, this.#auth.getAuthHeaders())
  }

  async contentCreate(type, data) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/${type}`
    return this.#request.post(endpoint, data, this.#auth.getAuthHeaders())
  }

  async contentUpdate(type, id, data) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/${type}/${id}`
    return this.#request.post(endpoint, data, {
      ...this.#auth.getAuthHeaders(),
      'X-HTTP-Method-Override': 'PUT',
    })
  }

  async contentDelete(type, id, force = true) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/${type}/${id}?force=${force}`
    return this.#request.delete(endpoint, this.#auth.getAuthHeaders())
  }

  async mediaUpload(file, options = {}) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/media`
    const formData = new FormData()
    formData.append('file', file)

    if (options.title) formData.append('title', options.title)
    if (options.caption) formData.append('caption', options.caption)
    if (options.description) formData.append('description', options.description)
    if (options.altText) formData.append('alt_text', options.altText)

    return this.#request.post(endpoint, formData, {
      ...this.#auth.getAuthHeaders(),
      'Content-Type': 'multipart/form-data',
    })
  }

  async mediaGet(id) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/media/${id}`
    return this.#request.get(endpoint, this.#auth.getAuthHeaders())
  }

  async mediaDelete(id, force = true) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/media/${id}?force=${force}`
    return this.#request.delete(endpoint, this.#auth.getAuthHeaders())
  }

  async getCategories(options = {}) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/categories`
    const params = this.#buildQueryParams(options)
    return this.#request.get(`${endpoint}${params}`, this.#auth.getAuthHeaders())
  }

  async getTags(options = {}) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/tags`
    const params = this.#buildQueryParams(options)
    return this.#request.get(`${endpoint}${params}`, this.#auth.getAuthHeaders())
  }

  async getUsers(options = {}) {
    const endpoint = `${this.#baseUrl}/wp-json/${WP_API_NAMESPACE}/users`
    const params = this.#buildQueryParams(options)
    return this.#request.get(`${endpoint}${params}`, this.#auth.getAuthHeaders())
  }

  async getYoastSeo(entityType, id) {
    const endpoint = `${this.#baseUrl}/wp-json/yoast/v1/${entityType}/${id}`
    try {
      return await this.#request.get(endpoint, this.#auth.getAuthHeaders())
    } catch {
      return null
    }
  }

  async health() {
    try {
      const start = Date.now()
      const info = await this.#request.get(`${this.#baseUrl}/wp-json/`, this.#auth.getAuthHeaders())
      const latency = Date.now() - start
      return {
        connected: this.#connected,
        latency,
        apiAvailable: true,
        version: info?.namespaces?.includes('wp/v2') ? info?.version || 'unknown' : 'unknown',
        siteName: info?.name || 'unknown',
      }
    } catch {
      return {
        connected: false,
        latency: -1,
        apiAvailable: false,
        version: null,
        siteName: null,
      }
    }
  }

  #normalizeUrl(url) {
    if (!url) return ''
    return url.replace(/\/+$/, '')
  }

  #buildQueryParams(options = {}) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    }
    const str = params.toString()
    return str ? `?${str}` : ''
  }
}

export default WordPressClient
