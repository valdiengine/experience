/**
 * P15.11.2 — Quote Capability Core
 *
 * Quote Capability - business capability for quote requests.
 */

import { createQuoteConfiguration } from './quote.schema.js'
import { createQuoteValidator, validateQuoteConfiguration, validateQuoteSelections, validateQuoteCustomerData } from './quote.validator.js'
import { createQuoteCalculator } from './quote.calculator.js'
import { QuoteRequest, createQuoteRequest } from './quote.model.js'
import { createQuoteInteractionBuilder } from './quote.interaction.js'
import {
  QuoteError,
  QuoteValidationError,
  QuoteCalculationError,
  QuoteMissingRequiredFieldError,
  QuoteInvalidOptionError
} from './quote.errors.js'

export const QUOTE_CAPABILITY_NAME = 'quote'
export const QUOTE_CAPABILITY_VERSION = '1.0.0'

export class QuoteCapability {
  #configuration
  #validator
  #calculator
  #interactionBuilder
  #enabled

  constructor(options = {}) {
    this.#configuration = options.configuration || createQuoteConfiguration({})
    this.#validator = createQuoteValidator(this.#configuration)
    this.#calculator = createQuoteCalculator(this.#configuration)
    this.#interactionBuilder = options.interactionBuilder || createQuoteInteractionBuilder()
    this.#enabled = this.#configuration.enabled !== false
  }

  isEnabled() {
    return this.#enabled
  }

  getConfiguration() {
    return { ...this.#configuration }
  }

  validateConfiguration(config) {
    return validateQuoteConfiguration(config)
  }

  validateRequest(request) {
    const errors = []

    if (!request || typeof request !== 'object') {
      throw new QuoteValidationError('Request must be an object')
    }

    if (!request.applicationId) {
      errors.push('Application ID is required')
    }

    if (!request.domain) {
      errors.push('Domain is required')
    }

    if (!request.route) {
      errors.push('Route is required')
    }

    const selectionsValidation = validateQuoteSelections(request.selections || {}, this.#configuration)
    if (!selectionsValidation.valid) {
      errors.push(...selectionsValidation.errors.map(e => `Selections: ${e}`))
    }

    const customerValidation = validateQuoteCustomerData(request.customerData || {}, this.#configuration)
    if (!customerValidation.valid) {
      errors.push(...customerValidation.errors.map(e => `CustomerData: ${e}`))
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors
      }
    }

    return { valid: true, errors: [] }
  }

  calculateQuote(request) {
    if (!this.#enabled) {
      throw new QuoteValidationError('Quote capability is not enabled')
    }

    const requestValidation = this.validateRequest(request)
    if (!requestValidation.valid) {
      throw new QuoteValidationError(requestValidation.errors.join('; '))
    }

    const quoteRequest = createQuoteRequest({
      applicationId: request.applicationId,
      domain: request.domain,
      route: request.route,
      company: request.company || null,
      destination: request.destination || null,
      configuration: this.#configuration,
      selections: request.selections || {},
      customerData: request.customerData || {},
      environment: request.environment || 'production'
    })

    const quoteResult = this.#calculator.calculate(quoteRequest.selections, {
      quoteRequestId: quoteRequest.id,
      applicationId: quoteRequest.applicationId,
      domain: quoteRequest.domain,
      route: quoteRequest.route,
      validityDays: this.#configuration.metadata?.validityDays || 7
    })

    return {
      request: quoteRequest.freeze(),
      result: quoteResult.freeze()
    }
  }

  async submitQuote(request, context = {}) {
    if (!this.#enabled) {
      throw new QuoteValidationError('Quote capability is not enabled')
    }

    const requestValidation = this.validateRequest(request)
    if (!requestValidation.valid) {
      throw new QuoteValidationError(requestValidation.errors.join('; '))
    }

    const quoteRequest = createQuoteRequest({
      applicationId: request.applicationId,
      domain: request.domain,
      route: request.route,
      company: request.company || null,
      destination: request.destination || null,
      configuration: this.#configuration,
      selections: request.selections || {},
      customerData: request.customerData || {},
      environment: request.environment || 'production'
    })

    const quoteResult = this.#calculator.calculate(quoteRequest.selections, {
      quoteRequestId: quoteRequest.id,
      applicationId: quoteRequest.applicationId,
      domain: quoteRequest.domain,
      route: quoteRequest.route,
      validityDays: this.#configuration.metadata?.validityDays || 7
    })

    const interactionResult = await this.#interactionBuilder.createInteraction(
      quoteRequest,
      quoteResult,
      context
    )

    return {
      request: quoteRequest.freeze(),
      result: quoteResult.freeze(),
      interaction: interactionResult.interaction,
      event: interactionResult.event
    }
  }

  getCapabilityInfo() {
    return {
      name: QUOTE_CAPABILITY_NAME,
      version: QUOTE_CAPABILITY_VERSION,
      type: 'business',
      enabled: this.#enabled,
      configuration: this.getConfiguration()
    }
  }

  static getName() {
    return QUOTE_CAPABILITY_NAME
  }

  static getVersion() {
    return QUOTE_CAPABILITY_VERSION
  }
}

export function createQuoteCapability(options = {}) {
  return new QuoteCapability(options)
}

export default {
  QuoteCapability,
  createQuoteCapability,
  QUOTE_CAPABILITY_NAME,
  QUOTE_CAPABILITY_VERSION
}
