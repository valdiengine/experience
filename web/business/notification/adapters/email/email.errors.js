/**
 * P15.11.5 — Email Delivery Adapter
 *
 * Email-specific error types.
 */

export class EmailError extends Error {
  constructor(message, code = 'EMAIL_ERROR') {
    super(message)
    this.name = 'EmailError'
    this.code = code
  }
}

export class EmailValidationError extends EmailError {
  constructor(message, details = null) {
    super(message, 'EMAIL_VALIDATION_ERROR')
    this.name = 'EmailValidationError'
    this.details = details
  }
}

export class EmailProviderError extends EmailError {
  constructor(message, providerCode = null, retryable = false) {
    super(message, providerCode || 'PROVIDER_ERROR')
    this.name = 'EmailProviderError'
    this.providerCode = providerCode
    this.retryable = retryable
  }
}

export class EmailRecipientError extends EmailError {
  constructor(message, recipient = null) {
    super(message, 'INVALID_RECIPIENT')
    this.name = 'EmailRecipientError'
    this.recipient = recipient
  }
}

export class EmailHeaderInjectionError extends EmailError {
  constructor(message) {
    super(message, 'HEADER_INJECTION')
    this.name = 'EmailHeaderInjectionError'
  }
}

export class EmailRateLimitError extends EmailError {
  constructor(message, limit = null) {
    super(message, 'RATE_LIMIT')
    this.name = 'EmailRateLimitError'
    this.limit = limit
  }
}

export class EmailAuthenticationError extends EmailError {
  constructor(message) {
    super(message, 'AUTH_ERROR')
    this.name = 'EmailAuthenticationError'
  }
}

export class EmailTimeoutError extends EmailError {
  constructor(message) {
    super(message, 'TIMEOUT')
    this.name = 'EmailTimeoutError'
  }
}

export class EmailDeliveryError extends EmailError {
  constructor(message, messageId = null) {
    super(message, 'DELIVERY_ERROR')
    this.name = 'EmailDeliveryError'
    this.messageId = messageId
  }
}

export const EMAIL_ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  HEADER_INJECTION: 'HEADER_INJECTION',
  RATE_LIMIT: 'RATE_LIMIT',
  AUTH_ERROR: 'AUTH_ERROR',
  TIMEOUT: 'TIMEOUT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  DELIVERY_REJECTED: 'DELIVERY_REJECTED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
})

export default {
  EmailError,
  EmailValidationError,
  EmailProviderError,
  EmailRecipientError,
  EmailHeaderInjectionError,
  EmailRateLimitError,
  EmailAuthenticationError,
  EmailTimeoutError,
  EmailDeliveryError,
  EMAIL_ERROR_CODES
}
