/**
 * P15.11.6 — WhatsApp Business Adapter
 *
 * WhatsApp-specific error types.
 */

export class WhatsAppError extends Error {
  constructor(message, code = 'WHATSAPP_ERROR') {
    super(message)
    this.name = 'WhatsAppError'
    this.code = code
  }
}

export class WhatsAppValidationError extends WhatsAppError {
  constructor(message, details = null) {
    super(message, 'WHATSAPP_VALIDATION_ERROR')
    this.name = 'WhatsAppValidationError'
    this.details = details
  }
}

export class WhatsAppProviderError extends WhatsAppError {
  constructor(message, providerCode = null, retryable = false) {
    super(message, providerCode || 'PROVIDER_ERROR')
    this.name = 'WhatsAppProviderError'
    this.providerCode = providerCode
    this.retryable = retryable
  }
}

export class WhatsAppRecipientError extends WhatsAppError {
  constructor(message, recipient = null) {
    super(message, 'INVALID_RECIPIENT')
    this.name = 'WhatsAppRecipientError'
    this.recipient = recipient
  }
}

export class WhatsAppRateLimitError extends WhatsAppError {
  constructor(message, limit = null) {
    super(message, 'RATE_LIMIT')
    this.name = 'WhatsAppRateLimitError'
    this.limit = limit
  }
}

export class WhatsAppAuthenticationError extends WhatsAppError {
  constructor(message) {
    super(message, 'AUTH_ERROR')
    this.name = 'WhatsAppAuthenticationError'
  }
}

export class WhatsAppTimeoutError extends WhatsAppError {
  constructor(message) {
    super(message, 'TIMEOUT')
    this.name = 'WhatsAppTimeoutError'
  }
}

export class WhatsAppMessageError extends WhatsAppError {
  constructor(message, messageId = null) {
    super(message, 'MESSAGE_ERROR')
    this.name = 'WhatsAppMessageError'
    this.messageId = messageId
  }
}

export const WHATSAPP_ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  INVALID_PHONE: 'INVALID_PHONE',
  RATE_LIMIT: 'RATE_LIMIT',
  AUTH_ERROR: 'AUTH_ERROR',
  TIMEOUT: 'TIMEOUT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  MESSAGE_REJECTED: 'MESSAGE_REJECTED',
  UNSUPPORTED_MESSAGE: 'UNSUPPORTED_MESSAGE',
  TEMPLATE_ERROR: 'TEMPLATE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
})

export default {
  WhatsAppError,
  WhatsAppValidationError,
  WhatsAppProviderError,
  WhatsAppRecipientError,
  WhatsAppRateLimitError,
  WhatsAppAuthenticationError,
  WhatsAppTimeoutError,
  WhatsAppMessageError,
  WHATSAPP_ERROR_CODES
}
