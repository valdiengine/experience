/**
 * WordPress Errors
 *
 * Error types for WordPress adapter.
 * Framework-free implementation.
 */

export class WordPressError extends Error {
  constructor(message, code = 'WP_ERROR') {
    super(message)
    this.name = 'WordPressError'
    this.code = code
  }
}

export class WordPressNotFoundError extends WordPressError {
  constructor(message = 'WordPress content not found') {
    super(message, 'NOT_FOUND')
    this.name = 'WordPressNotFoundError'
  }
}

export class WordPressConfigError extends WordPressError {
  constructor(message = 'WordPress configuration error') {
    super(message, 'CONFIG_ERROR')
    this.name = 'WordPressConfigError'
  }
}

export class WordPressNetworkError extends WordPressError {
  constructor(message = 'WordPress network error') {
    super(message, 'NETWORK_ERROR')
    this.name = 'WordPressNetworkError'
  }
}

export class WordPressTimeoutError extends WordPressError {
  constructor(message = 'WordPress request timeout') {
    super(message, 'TIMEOUT')
    this.name = 'WordPressTimeoutError'
  }
}

export class WordPressValidationError extends WordPressError {
  constructor(message = 'WordPress validation error') {
    super(message, 'VALIDATION_ERROR')
    this.name = 'WordPressValidationError'
  }
}

export class WordPressSSRFBlockedError extends WordPressError {
  constructor(message = 'Request blocked by SSRF protection') {
    super(message, 'SSRF_BLOCKED')
    this.name = 'WordPressSSRFBlockedError'
  }
}

export default {
  WordPressError,
  WordPressNotFoundError,
  WordPressConfigError,
  WordPressNetworkError,
  WordPressTimeoutError,
  WordPressValidationError,
  WordPressSSRFBlockedError
}
