/**
 * P15.11.2 — Quote Capability Core
 *
 * Quote model, types, and schemas.
 */

export const QUOTE_CAPABILITY_TYPES = Object.freeze({
  QUOTE: 'quote'
})

export const QUOTE_STATUS = Object.freeze({
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  RESPONDED: 'responded',
  CONVERTED: 'converted',
  CLOSED: 'closed',
  CANCELLED: 'cancelled'
})

export const QUOTE_ENVIRONMENTS = Object.freeze({
  PREVIEW: 'preview',
  PRODUCTION: 'production'
})

export const QUOTE_CUSTOMER_FIELDS = Object.freeze({
  NAME: 'name',
  EMAIL: 'email',
  PHONE: 'phone',
  COMPANY: 'company',
  MESSAGE: 'message'
})

export class QuoteRequest {
  #id
  #applicationId
  #domain
  #route
  #company
  #destination
  #configuration
  #selections
  #customerData
  #environment
  #createdAt
  #correlationId

  constructor(data = {}) {
    this.#id = data.id || this.#generateId()
    this.#applicationId = data.applicationId || null
    this.#domain = data.domain || null
    this.#route = data.route || null
    this.#company = data.company || null
    this.#destination = data.destination || null
    this.#configuration = data.configuration || {}
    this.#selections = data.selections || {}
    this.#customerData = data.customerData || {}
    this.#environment = data.environment || QUOTE_ENVIRONMENTS.PRODUCTION
    this.#createdAt = data.createdAt || new Date().toISOString()
    this.#correlationId = data.correlationId || this.#generateCorrelationId()
  }

  #generateId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `qt_${timestamp}${random}`
  }

  #generateCorrelationId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `corr_${timestamp}${random}`
  }

  get id() {
    return this.#id
  }

  get applicationId() {
    return this.#applicationId
  }

  get domain() {
    return this.#domain
  }

  get route() {
    return this.#route
  }

  get company() {
    return this.#company
  }

  get destination() {
    return this.#destination
  }

  get configuration() {
    return { ...this.#configuration }
  }

  get selections() {
    return { ...this.#selections }
  }

  get customerData() {
    return { ...this.#customerData }
  }

  get environment() {
    return this.#environment
  }

  get createdAt() {
    return this.#createdAt
  }

  get correlationId() {
    return this.#correlationId
  }

  toJSON() {
    return {
      id: this.#id,
      applicationId: this.#applicationId,
      domain: this.#domain,
      route: this.#route,
      company: this.#company,
      destination: this.#destination,
      configuration: { ...this.#configuration },
      selections: { ...this.#selections },
      customerData: { ...this.#customerData },
      environment: this.#environment,
      createdAt: this.#createdAt,
      correlationId: this.#correlationId
    }
  }

  freeze() {
    return Object.freeze(this.toJSON())
  }
}

export class QuoteResult {
  #id
  #quoteRequestId
  #applicationId
  #domain
  #route
  #total
  #currency
  #lineItems
  #breakdown
  #inputSummary
  #calculationMetadata
  #validUntil
  #createdAt

  constructor(data = {}) {
    this.#id = data.id || this.#generateId()
    this.#quoteRequestId = data.quoteRequestId || null
    this.#applicationId = data.applicationId || null
    this.#domain = data.domain || null
    this.#route = data.route || null
    this.#total = data.total || 0
    this.#currency = data.currency || 'CLP'
    this.#lineItems = data.lineItems || []
    this.#breakdown = data.breakdown || {}
    this.#inputSummary = data.inputSummary || {}
    this.#calculationMetadata = data.calculationMetadata || {}
    this.#validUntil = data.validUntil || null
    this.#createdAt = data.createdAt || new Date().toISOString()
  }

  #generateId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `qr_${timestamp}${random}`
  }

  get id() {
    return this.#id
  }

  get quoteRequestId() {
    return this.#quoteRequestId
  }

  get applicationId() {
    return this.#applicationId
  }

  get domain() {
    return this.#domain
  }

  get route() {
    return this.#route
  }

  get total() {
    return this.#total
  }

  get currency() {
    return this.#currency
  }

  get lineItems() {
    return [...this.#lineItems]
  }

  get breakdown() {
    return { ...this.#breakdown }
  }

  get inputSummary() {
    return { ...this.#inputSummary }
  }

  get calculationMetadata() {
    return { ...this.#calculationMetadata }
  }

  get validUntil() {
    return this.#validUntil
  }

  get createdAt() {
    return this.#createdAt
  }

  toJSON() {
    return {
      id: this.#id,
      quoteRequestId: this.#quoteRequestId,
      applicationId: this.#applicationId,
      domain: this.#domain,
      route: this.#route,
      total: this.#total,
      currency: this.#currency,
      lineItems: [...this.#lineItems],
      breakdown: { ...this.#breakdown },
      inputSummary: { ...this.#inputSummary },
      calculationMetadata: { ...this.#calculationMetadata },
      validUntil: this.#validUntil,
      createdAt: this.#createdAt
    }
  }

  freeze() {
    return Object.freeze(this.toJSON())
  }
}

export function createQuoteRequest(data) {
  return new QuoteRequest(data)
}

export function createQuoteResult(data) {
  return new QuoteResult(data)
}

export default {
  QUOTE_CAPABILITY_TYPES,
  QUOTE_STATUS,
  QUOTE_ENVIRONMENTS,
  QUOTE_CUSTOMER_FIELDS,
  QuoteRequest,
  QuoteResult,
  createQuoteRequest,
  createQuoteResult
}
