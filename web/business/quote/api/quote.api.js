/**
 * P15.11.3 — Quote Public API
 *
 * API endpoints for public quote operations.
 * This API is used by the public Quote UI.
 */

import { createQuoteCapability, QUOTE_CAPABILITY_NAME } from '../quote.capability.js'
import {
  QuoteValidationError,
  QuoteCalculationError
} from '../quote.errors.js'

export class QuoteAPI {
  #capabilityFactory
  #options

  constructor(options = {}) {
    this.#options = Object.freeze({ ...options })
    this.#capabilityFactory = options.capabilityFactory || ((config) => createQuoteCapability({ configuration: config }))
  }

  handleCalculate(request) {
    const { applicationId, domain, route, company, destination, selections, customerData, configuration } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!configuration || typeof configuration !== 'object') {
      return {
        success: false,
        error: 'Quote configuration is required',
        status: 400
      }
    }

    if (!configuration.enabled) {
      return {
        success: false,
        error: 'Quote capability is not enabled',
        status: 403
      }
    }

    try {
      const capability = this.#capabilityFactory(configuration)

      if (!capability.isEnabled()) {
        return {
          success: false,
          error: 'Quote capability is not enabled',
          status: 403
        }
      }

      const result = capability.calculateQuote({
        applicationId,
        domain,
        route,
        company,
        destination,
        selections: selections || {},
        customerData: customerData || {},
        environment: 'production'
      })

      return {
        success: true,
        data: {
          request: result.request,
          result: result.result
        },
        status: 200
      }
    } catch (error) {
      if (error instanceof QuoteValidationError) {
        return { success: false, error: error.message, status: 400 }
      }
      if (error instanceof QuoteCalculationError) {
        return { success: false, error: error.message, status: 422 }
      }
      throw error
    }
  }

  async handleSubmit(request, submitContext = {}) {
    const { applicationId, domain, route, company, destination, selections, customerData, configuration } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!configuration || typeof configuration !== 'object') {
      return {
        success: false,
        error: 'Quote configuration is required',
        status: 400
      }
    }

    if (!configuration.enabled) {
      return {
        success: false,
        error: 'Quote capability is not enabled',
        status: 403
      }
    }

    try {
      const capability = this.#capabilityFactory(configuration)

      if (!capability.isEnabled()) {
        return {
          success: false,
          error: 'Quote capability is not enabled',
          status: 403
        }
      }

      const context = {
        ...submitContext,
        source: 'quote-public-api'
      }

      const result = await capability.submitQuote({
        applicationId,
        domain,
        route,
        company,
        destination,
        selections: selections || {},
        customerData: customerData || {},
        environment: submitContext.preview ? 'preview' : 'production'
      }, context)

      return {
        success: true,
        data: {
          request: result.request,
          result: result.result,
          interactionId: result.interaction?.id,
          event: result.event || null
        },
        status: 201
      }
    } catch (error) {
      if (error instanceof QuoteValidationError) {
        return { success: false, error: error.message, status: 400 }
      }
      if (error instanceof QuoteCalculationError) {
        return { success: false, error: error.message, status: 422 }
      }
      throw error
    }
  }

  handleValidate(request) {
    const { applicationId, domain, route, selections, customerData, configuration } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!configuration || typeof configuration !== 'object') {
      return {
        success: false,
        error: 'Quote configuration is required',
        status: 400
      }
    }

    try {
      const capability = this.#capabilityFactory(configuration)

      if (!capability.isEnabled()) {
        return {
          success: false,
          error: 'Quote capability is not enabled',
          status: 403
        }
      }

      const validation = capability.validateRequest({
        applicationId,
        domain,
        route,
        selections: selections || {},
        customerData: customerData || {}
      })

      return {
        success: true,
        data: validation,
        status: 200
      }
    } catch (error) {
      if (error instanceof QuoteValidationError) {
        return { success: false, error: error.message, status: 400 }
      }
      throw error
    }
  }

  handleGetConfiguration(request) {
    const { configuration } = request

    if (!configuration || typeof configuration !== 'object') {
      return {
        success: false,
        error: 'Quote configuration is required',
        status: 400
      }
    }

    try {
      const capability = this.#capabilityFactory(configuration)
      const info = capability.getCapabilityInfo()

      const publicInfo = {
        name: info.name,
        version: info.version,
        enabled: info.enabled,
        configuration: {
          title: info.configuration.title,
          description: info.configuration.description,
          currency: info.configuration.currency,
          options: info.configuration.options,
          customerFields: info.configuration.customerFields,
          metadata: info.configuration.metadata
        }
      }

      return {
        success: true,
        data: publicInfo,
        status: 200
      }
    } catch (error) {
      if (error instanceof QuoteValidationError) {
        return { success: false, error: error.message, status: 400 }
      }
      throw error
    }
  }
}

export function createQuoteAPI(options = {}) {
  return new QuoteAPI(options)
}

export default {
  QuoteAPI,
  createQuoteAPI
}
