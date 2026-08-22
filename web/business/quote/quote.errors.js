/**
 * P15.11.2 — Quote Capability Core
 *
 * Error types for Quote operations.
 */

export const QUOTE_ERROR_CODES = Object.freeze({
  INVALID_CONFIGURATION: 'QUOTE_INVALID_CONFIGURATION',
  VALIDATION_ERROR: 'QUOTE_VALIDATION_ERROR',
  CALCULATION_ERROR: 'QUOTE_CALCULATION_ERROR',
  INVALID_INPUT: 'QUOTE_INVALID_INPUT',
  INVALID_OPTION: 'QUOTE_INVALID_OPTION',
  INVALID_FIELD: 'QUOTE_INVALID_FIELD',
  MISSING_REQUIRED_FIELD: 'QUOTE_MISSING_REQUIRED_FIELD',
  INVALID_PRICING_RULE: 'QUOTE_INVALID_PRICING_RULE',
  NUMERIC_OVERFLOW: 'QUOTE_NUMERIC_OVERFLOW',
  INTERACTION_ERROR: 'QUOTE_INTERACTION_ERROR',
  ISOLATION_VIOLATION: 'QUOTE_ISOLATION_VIOLATION'
})

export class QuoteError extends Error {
  constructor(message, code = 'QUOTE_ERROR') {
    super(message)
    this.name = 'QuoteError'
    this.code = code
  }
}

export class QuoteValidationError extends QuoteError {
  constructor(message) {
    super(message, QUOTE_ERROR_CODES.VALIDATION_ERROR)
    this.name = 'QuoteValidationError'
  }
}

export class QuoteCalculationError extends QuoteError {
  constructor(message) {
    super(message, QUOTE_ERROR_CODES.CALCULATION_ERROR)
    this.name = 'QuoteCalculationError'
  }
}

export class QuoteInvalidInputError extends QuoteError {
  constructor(field, message) {
    super(`Invalid input for ${field}: ${message}`, QUOTE_ERROR_CODES.INVALID_INPUT)
    this.name = 'QuoteInvalidInputError'
    this.field = field
  }
}

export class QuoteMissingRequiredFieldError extends QuoteError {
  constructor(field) {
    super(`Missing required field: ${field}`, QUOTE_ERROR_CODES.MISSING_REQUIRED_FIELD)
    this.name = 'QuoteMissingRequiredFieldError'
    this.field = field
  }
}

export class QuoteInvalidOptionError extends QuoteError {
  constructor(optionId) {
    super(`Invalid option: ${optionId}`, QUOTE_ERROR_CODES.INVALID_OPTION)
    this.name = 'QuoteInvalidOptionError'
    this.optionId = optionId
  }
}

export class QuoteInvalidPricingRuleError extends QuoteError {
  constructor(ruleId, message) {
    super(`Invalid pricing rule ${ruleId}: ${message}`, QUOTE_ERROR_CODES.INVALID_PRICING_RULE)
    this.name = 'QuoteInvalidPricingRuleError'
    this.ruleId = ruleId
  }
}

export class QuoteNumericOverflowError extends QuoteError {
  constructor(value, maxValue) {
    super(`Numeric overflow: ${value} exceeds maximum ${maxValue}`, QUOTE_ERROR_CODES.NUMERIC_OVERFLOW)
    this.name = 'QuoteNumericOverflowError'
    this.value = value
    this.maxValue = maxValue
  }
}

export class QuoteInteractionError extends QuoteError {
  constructor(message) {
    super(`Interaction error: ${message}`, QUOTE_ERROR_CODES.INTERACTION_ERROR)
    this.name = 'QuoteInteractionError'
  }
}

export class QuoteIsolationViolationError extends QuoteError {
  constructor(message) {
    super(`Isolation violation: ${message}`, QUOTE_ERROR_CODES.ISOLATION_VIOLATION)
    this.name = 'QuoteIsolationViolationError'
  }
}

export default {
  QUOTE_ERROR_CODES,
  QuoteError,
  QuoteValidationError,
  QuoteCalculationError,
  QuoteInvalidInputError,
  QuoteMissingRequiredFieldError,
  QuoteInvalidOptionError,
  QuoteInvalidPricingRuleError,
  QuoteNumericOverflowError,
  QuoteInteractionError,
  QuoteIsolationViolationError
}
