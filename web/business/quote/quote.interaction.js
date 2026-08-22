/**
 * P15.11.2 — Quote Capability Core
 *
 * Integration with BusinessInteraction Core.
 */

import { createApplicationInbox } from '../interaction/index.js'
import { INTERACTION_TYPES, INTERACTION_ENVIRONMENTS, INTERACTION_STATUS } from '../interaction/index.js'
import { QuoteInteractionError, QuoteIsolationViolationError } from './quote.errors.js'

export class QuoteInteractionBuilder {
  #inbox
  #options

  constructor(options = {}) {
    this.#inbox = options.inbox || createApplicationInbox()
    this.#options = Object.freeze({ ...options })
  }

  async createInteraction(quoteRequest, quoteResult, context = {}) {
    if (!quoteRequest || !quoteRequest.applicationId) {
      throw new QuoteInteractionError('QuoteRequest with applicationId is required')
    }

    if (!quoteResult) {
      throw new QuoteInteractionError('QuoteResult is required')
    }

    const interactionData = {
      type: INTERACTION_TYPES.QUOTE_REQUEST,
      applicationId: quoteRequest.applicationId,
      domain: quoteRequest.domain,
      route: quoteRequest.route,
      company: quoteRequest.company,
      destination: quoteRequest.destination,
      status: INTERACTION_STATUS.NEW,
      environment: quoteRequest.environment || INTERACTION_ENVIRONMENTS.PRODUCTION,
      source: 'quote-capability',
      payload: {
        quoteId: quoteResult.id,
        quoteRequestId: quoteRequest.id,
        total: quoteResult.total,
        currency: quoteResult.currency,
        lineItems: quoteResult.lineItems,
        breakdown: quoteResult.breakdown,
        inputSummary: quoteResult.inputSummary,
        validUntil: quoteResult.validUntil,
        customerData: quoteRequest.customerData,
        selections: quoteRequest.selections,
        configuration: {
          title: quoteRequest.configuration?.title,
          currency: quoteRequest.configuration?.currency
        }
      },
      metadata: {
        quoteCapability: '1.0.0',
        calculationDurationMs: quoteResult.calculationMetadata?.calculationDurationMs,
        pricingRulesApplied: quoteResult.calculationMetadata?.pricingRulesApplied
      },
      correlationId: quoteRequest.correlationId
    }

    const validation = this.#validateInteractionData(interactionData)
    if (!validation.valid) {
      throw new QuoteInteractionError(`Invalid interaction data: ${validation.errors.join(', ')}`)
    }

    try {
      const result = this.#inbox.create(
        quoteRequest.applicationId,
        interactionData,
        { source: 'quote-capability', ...context }
      )

      return {
        interaction: result.interaction,
        event: result.event,
        quoteRequestId: quoteRequest.id,
        quoteResultId: quoteResult.id
      }
    } catch (error) {
      if (error.name === 'InteractionIsolationViolationError') {
        throw new QuoteIsolationViolationError(error.message)
      }
      throw new QuoteInteractionError(`Failed to create interaction: ${error.message}`)
    }
  }

  #validateInteractionData(data) {
    const errors = []

    if (!data.type) {
      errors.push('Interaction type is required')
    }

    if (!data.applicationId) {
      errors.push('Application ID is required')
    }

    if (!data.domain) {
      errors.push('Domain is required')
    }

    if (!data.route) {
      errors.push('Route is required')
    }

    if (!data.payload || typeof data.payload !== 'object') {
      errors.push('Payload must be an object')
    }

    if (data.payload && typeof data.payload.total !== 'number') {
      errors.push('Payload total must be a number')
    }

    if (data.payload && typeof data.payload.currency !== 'string') {
      errors.push('Payload currency must be a string')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  getInbox() {
    return this.#inbox
  }
}

export function createQuoteInteractionBuilder(options = {}) {
  return new QuoteInteractionBuilder(options)
}

export default {
  QuoteInteractionBuilder,
  createQuoteInteractionBuilder
}
