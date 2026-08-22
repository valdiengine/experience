/**
 * WordPress Client
 *
 * HTTP client for WordPress REST API.
 * Handles requests with timeout, retries, and error handling.
 * Framework-free implementation.
 */

import { WordPressNetworkError, WordPressTimeoutError, WordPressValidationError, WordPressSSRFBlockedError } from './wordpress.errors.js'

const DEFAULT_TIMEOUT = 5000
const DEFAULT_RETRIES = 1

const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^224\./,
  /^240\./,
  /^::1$/,
  /^\[::1\]$/,
  /^::$/,
  /^\[::\]$/,
  /^[fF][cCdD][0-9a-fA-F]{2}:/,
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^0\.0\.0\.0$/,
  /^.*\.local$/i,
  /^.*\.localhost$/i
]

const BLOCKED_HOSTNAMES = [
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.azure.com',
  '100.100.100.200'
]

const ALLOWED_PROTOCOLS = ['http:', 'https:']

export class WordPressClient {
  constructor(config = {}) {
    this.endpoint = config.endpoint
    this.apiKey = config.apiKey
    this.timeout = config.timeout || DEFAULT_TIMEOUT
    this.retries = config.retries || DEFAULT_RETRIES

    if (!this.endpoint) {
      throw new WordPressValidationError('WordPress endpoint is required')
    }
  }

  async request(path, options = {}) {
    const url = this._buildUrl(path)
    await this._validateUrl(url)
    const method = options.method || 'GET'
    const timeout = options.timeout || this.timeout
    const retries = options.retries !== undefined ? options.retries : this.retries

    let lastError

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this._doRequest(url, method, timeout, options.body, options.headers)
      } catch (error) {
        lastError = error

        if (attempt < retries && this._isRetryable(error)) {
          await this._delay(100 * (attempt + 1))
          continue
        }

        throw error
      }
    }

    throw lastError
  }

  async _validateUrl(url) {
    let parsed

    try {
      parsed = new URL(url)
    } catch {
      throw new WordPressSSRFBlockedError(`Invalid URL: ${url}`)
    }

    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      throw new WordPressSSRFBlockedError(`Protocol not allowed: ${parsed.protocol}`)
    }

    const hostname = parsed.hostname

    if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) {
      throw new WordPressSSRFBlockedError(`Hostname blocked: ${hostname}`)
    }

    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new WordPressSSRFBlockedError(`Hostname blocked: ${hostname}`)
      }
    }

    try {
      const dns = await import('dns')
      const { promises: dnsPromises } = dns
      const addresses = await dnsPromises.lookup(hostname)

      if (addresses.address) {
        if (this._isBlockedIP(addresses.address)) {
          throw new WordPressSSRFBlockedError(`DNS resolved to blocked IP: ${addresses.address}`)
        }
      }

      if (Array.isArray(addresses)) {
        for (const addr of addresses) {
          if (addr.address && this._isBlockedIP(addr.address)) {
            throw new WordPressSSRFBlockedError(`DNS resolved to blocked IP: ${addr.address}`)
          }
        }
      }
    } catch (error) {
      if (error instanceof WordPressSSRFBlockedError) {
        throw error
      }
    }

    return true
  }

  _isBlockedIP(ip) {
    const parts = ip.split('.')

    if (parts.length === 4) {
      const first = parseInt(parts[0], 10)
      const second = parseInt(parts[1], 10)

      if (first === 127) return true
      if (first === 10) return true
      if (first === 172 && second >= 16 && second <= 31) return true
      if (first === 192 && second === 168) return true
      if (first === 169 && second === 254) return true
      if (first === 0) return true
    }

    if (ip === '::1' || ip === '::') return true
    if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true

    return false
  }

  _validateUrlSync(url) {
    let parsed

    try {
      parsed = new URL(url)
    } catch {
      throw new WordPressSSRFBlockedError(`Invalid URL: ${url}`)
    }

    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      throw new WordPressSSRFBlockedError(`Protocol not allowed: ${parsed.protocol}`)
    }

    const hostname = parsed.hostname

    if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) {
      throw new WordPressSSRFBlockedError(`Hostname blocked: ${hostname}`)
    }

    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        throw new WordPressSSRFBlockedError(`Hostname blocked: ${hostname}`)
      }
    }

    return true
  }

  _normalizeHeaders(fetchHeaders) {
    const headers = {}
    if (fetchHeaders && typeof fetchHeaders.forEach === 'function') {
      fetchHeaders.forEach((value, key) => {
        headers[key.toLowerCase()] = value
      })
    } else if (fetchHeaders && typeof fetchHeaders === 'object') {
      Object.keys(fetchHeaders).forEach(key => {
        headers[key.toLowerCase()] = fetchHeaders[key]
      })
    }
    return headers
  }

  async _doRequest(url, method, timeout, body, headers) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const fetchOptions = {
        method,
        headers: this._buildHeaders(headers),
        signal: controller.signal,
        redirect: 'error'
      }

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body)
        fetchOptions.headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(url, fetchOptions)

      clearTimeout(timeoutId)

      const httpStatus = response.status
      const normalizedHeaders = this._normalizeHeaders(response.headers)

      if (!response.ok) {
        throw new WordPressNetworkError(`HTTP ${httpStatus}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''

      let responseBody
      if (contentType.includes('application/json')) {
        responseBody = await response.json()
      } else {
        responseBody = await response.text()
      }

      return {
        status: httpStatus,
        headers: normalizedHeaders,
        body: responseBody
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error.message === 'The URL contains a redirect') {
        throw new WordPressSSRFBlockedError('Redirect blocked: possible SSRF attempt')
      }

      if (error.name === 'AbortError') {
        throw new WordPressTimeoutError(`Request timeout after ${timeout}ms`)
      }

      if (error instanceof WordPressSSRFBlockedError || error instanceof WordPressNetworkError || error instanceof WordPressTimeoutError) {
        throw error
      }

      throw new WordPressNetworkError(`Request failed: ${error.message}`)
    }
  }

  _buildUrl(path) {
    const base = this.endpoint.replace(/\/$/, '')
    const cleanPath = path.replace(/^\//, '')

    if (path.includes('?')) {
      return `${base}/${cleanPath}`
    }

    return `${base}/${cleanPath}`
  }

  _buildHeaders(extraHeaders = {}) {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'Valdi-WordPress-Adapter/1.0'
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    return { ...headers, ...extraHeaders }
  }

  _isRetryable(error) {
    if (error instanceof WordPressTimeoutError) {
      return true
    }

    if (error instanceof WordPressNetworkError) {
      return error.message.includes('ECONNREFUSED') ||
             error.message.includes('ETIMEDOUT') ||
             error.message.includes('ECONNRESET')
    }

    return false
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' })
  }

  async post(path, body, options = {}) {
    return this.request(path, { ...options, method: 'POST', body })
  }
}

export function createWordPressClient(config) {
  return new WordPressClient(config)
}

export default {
  WordPressClient,
  createWordPressClient
}
