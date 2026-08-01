import { WordPressRateLimitError, WordPressTimeoutError, WordPressNotFoundError } from '../errors/wordpress.provider.errors.js'
import { WordPressResponseError } from './wordpress.errors.js'

export class WordPressRequest {
  #timeout = 30000
  #retryCount = 3
  #retryDelay = 1000
  #rateLimitRemaining = null
  #rateLimitReset = null
  #correlationId = null

  constructor(config = {}) {
    this.#timeout = config.timeout || 30000
    this.#retryCount = config.retryCount || 3
    this.#retryDelay = config.retryDelay || 1000
  }

  setCorrelationId(id) {
    this.#correlationId = id
  }

  async get(url, headers = {}) {
    return this.#request('GET', url, null, headers)
  }

  async post(url, body, headers = {}) {
    return this.#request('POST', url, body, headers)
  }

  async put(url, body, headers = {}) {
    return this.#request('PUT', url, body, headers)
  }

  async delete(url, headers = {}) {
    return this.#request('DELETE', url, null, headers)
  }

  async #request(method, url, body, headers) {
    await this.#checkRateLimit()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.#timeout)

    try {
      const response = await this.#executeWithRetry(method, url, body, {
        ...headers,
        ...this.#getCorrelationHeader(),
      }, controller.signal)

      this.#updateRateLimit(response)
      return this.#parseResponse(response)
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new WordPressTimeoutError(`Request timed out after ${this.#timeout}ms`, { url, method })
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async #executeWithRetry(method, url, body, headers, signal, attempt = 1) {
    try {
      const options = {
        method,
        headers: this.#buildHeaders(headers),
        signal,
      }

      if (body && method !== 'GET' && method !== 'DELETE') {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(url, options)

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
        throw new WordPressRateLimitError('Rate limit exceeded', { retryAfter, url, method })
      }

      if (response.status === 401 || response.status === 403) {
        const errorBody = await response.text().catch(() => '')
        throw new WordPressResponseError(`Authentication failed: ${response.status}`, response.status, { url, method, body: errorBody })
      }

      if (response.status === 404) {
        throw new WordPressNotFoundError('Resource not found', { url, method })
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new WordPressResponseError(`Request failed: ${response.status}`, response.status, { url, method, body: errorBody })
      }

      return response
    } catch (err) {
      if (err instanceof WordPressRateLimitError) {
        await this.#wait(err.context.retryAfter * 1000)
        return this.#executeWithRetry(method, url, body, headers, signal, attempt + 1)
      }

      if (attempt < this.#retryCount && this.#isRetryable(err)) {
        const delay = this.#retryDelay * Math.pow(2, attempt - 1)
        await this.#wait(delay)
        return this.#executeWithRetry(method, url, body, headers, signal, attempt + 1)
      }

      throw err
    }
  }

  #isRetryable(err) {
    if (err instanceof WordPressRateLimitError) return true
    if (err instanceof WordPressTimeoutError) return true
    if (err instanceof TypeError) return true
    if (err.name === 'TypeError') return true
    return false
  }

  #buildHeaders(headers) {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Valdi-Engine-CMS-WordPress-Provider/1.0',
      ...headers,
    }
  }

  #getCorrelationHeader() {
    if (!this.#correlationId) return {}
    return { 'X-Correlation-ID': this.#correlationId }
  }

  async #parseResponse(response) {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return response.json()
    }
    return response.text()
  }

  async #checkRateLimit() {
    if (this.#rateLimitRemaining !== null && this.#rateLimitRemaining <= 0 && this.#rateLimitReset) {
      const waitTime = (this.#rateLimitReset * 1000) - Date.now() + 1000
      if (waitTime > 0) {
        throw new WordPressRateLimitError('Rate limit exhausted', { resetAt: this.#rateLimitReset, waitTime })
      }
    }
  }

  #updateRateLimit(response) {
    const remaining = response.headers.get('X-WP-RateLimit-Remaining')
    const reset = response.headers.get('X-WP-RateLimit-Reset')
    if (remaining !== null) this.#rateLimitRemaining = parseInt(remaining, 10)
    if (reset !== null) this.#rateLimitReset = parseInt(reset, 10)
  }

  #wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default WordPressRequest
