/**
 * P15.11.3 — Quote Runtime
 *
 * Runtime integration for Quote Capability in the Experience layer.
 * Bridges the Quote UI Component with the Quote API.
 */

import { createQuoteAPI } from './api/quote.api.js'

export const QUOTE_RUNTIME_EVENTS = {
  QUOTE_CALCULATE_REQUEST: 'quote:calculate:request',
  QUOTE_CALCULATE_SUCCESS: 'quote:calculate:success',
  QUOTE_CALCULATE_ERROR: 'quote:calculate:error',
  QUOTE_SUBMIT_REQUEST: 'quote:submit:request',
  QUOTE_SUBMIT_SUCCESS: 'quote:submit:success',
  QUOTE_SUBMIT_ERROR: 'quote:submit:error'
}

export class QuoteRuntime {
  #quoteAPI
  #applicationContext
  #eventBus
  #initialized

  constructor(options = {}) {
    this.#quoteAPI = options.quoteAPI || createQuoteAPI()
    this.#applicationContext = options.applicationContext || null
    this.#eventBus = options.eventBus || null
    this.#initialized = false
  }

  initialize(applicationContext) {
    if (!applicationContext) {
      throw new Error('ApplicationContext is required')
    }
    this.#applicationContext = applicationContext
    this.#initialized = true
    this.#emit(QUOTE_RUNTIME_EVENTS.QUOTE_INITIALIZED, {
      applicationId: applicationContext.identity?.applicationId
    })
  }

  isInitialized() {
    return this.#initialized
  }

  getApplicationContext() {
    return this.#applicationContext
  }

  calculateQuote(request) {
    if (!this.#initialized) {
      return {
        success: false,
        error: 'QuoteRuntime not initialized',
        status: 500
      }
    }

    const config = this.#getQuoteConfiguration()
    if (!config) {
      return {
        success: false,
        error: 'Quote capability not configured',
        status: 400
      }
    }

    const identity = this.#applicationContext.identity

    const apiRequest = {
      applicationId: identity.applicationId,
      domain: identity.domain,
      route: identity.route,
      company: identity.company,
      destination: identity.destination,
      selections: {
        options: request.options || [],
        fields: request.fields || {},
        quantity: request.quantity || 1
      },
      customerData: request.customerData || {},
      configuration: config
    }

    this.#emit(QUOTE_RUNTIME_EVENTS.QUOTE_CALCULATE_REQUEST, apiRequest)

    const result = this.#quoteAPI.handleCalculate(apiRequest)

    if (result.success) {
      this.#emit(QUOTE_RUNTIME_EVENTS.QUOTE_CALCULATE_SUCCESS, result.data)
    } else {
      this.#emit(QUOTE_RUNTIME_EVENTS.QUOTE_CALCULATE_ERROR, { error: result.error })
    }

    return result
  }

  submitQuote(request, options = {}) {
    if (!this.#initialized) {
      return {
        success: false,
        error: 'QuoteRuntime not initialized',
        status: 500
      }
    }

    const config = this.#getQuoteConfiguration()
    if (!config) {
      return {
        success: false,
        error: 'Quote capability not configured',
        status: 400
      }
    }

    const identity = this.#applicationContext.identity

    const apiRequest = {
      applicationId: identity.applicationId,
      domain: identity.domain,
      route: identity.route,
      company: identity.company,
      destination: identity.destination,
      selections: {
        options: request.options || [],
        fields: request.fields || {},
        quantity: request.quantity || 1
      },
      customerData: request.customerData || {},
      configuration: config
    }

    const context = {
      preview: options.preview || false,
      source: 'quote-runtime'
    }

    this.#emit(QUOTE_RUNTIME_EVENTS.QUOTE_SUBMIT_REQUEST, apiRequest)

    const result = this.#quoteAPI.handleSubmit(apiRequest, context)

    if (result.success) {
      this.#emit(QUOTE_RUNTIME_EVENTS.QUOTE_SUBMIT_SUCCESS, result.data)
    } else {
      this.#emit(QUOTE_RUNTIME_EVENTS.QUOTE_SUBMIT_ERROR, { error: result.error })
    }

    return result
  }

  validateRequest(request) {
    if (!this.#initialized) {
      return {
        success: false,
        error: 'QuoteRuntime not initialized',
        status: 500
      }
    }

    const config = this.#getQuoteConfiguration()
    if (!config) {
      return {
        success: false,
        error: 'Quote capability not configured',
        status: 400
      }
    }

    const identity = this.#applicationContext.identity

    const apiRequest = {
      applicationId: identity.applicationId,
      domain: identity.domain,
      route: identity.route,
      selections: request.selections || {},
      customerData: request.customerData || {},
      configuration: config
    }

    return this.#quoteAPI.handleValidate(apiRequest)
  }

  getQuoteConfiguration() {
    return this.#getQuoteConfiguration()
  }

  hasQuoteCapability() {
    return this.#getQuoteConfiguration() !== null
  }

  isQuoteEnabled() {
    const config = this.#getQuoteConfiguration()
    return config !== null && config.enabled === true
  }

  #getQuoteConfiguration() {
    if (!this.#applicationContext) {
      return null
    }

    const capabilities = this.#applicationContext.composition?.capabilities || []
    const quoteCap = capabilities.find(cap => cap.name === 'quote')

    if (!quoteCap) {
      return null
    }

    return quoteCap.configuration || null
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, {
        type: event,
        timestamp: new Date().toISOString(),
        ...data
      })
    }
  }

  health() {
    return {
      status: this.#initialized ? 'healthy' : 'uninitialized',
      quoteEnabled: this.isQuoteEnabled(),
      hasConfiguration: this.#getQuoteConfiguration() !== null
    }
  }
}

export function createQuoteRuntime(options = {}) {
  return new QuoteRuntime(options)
}

export default {
  QuoteRuntime,
  createQuoteRuntime,
  QUOTE_RUNTIME_EVENTS
}
