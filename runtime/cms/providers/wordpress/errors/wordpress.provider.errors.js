import { CmsProviderError } from '../../../contracts/cms.errors.js'

export class WordPressProviderError extends CmsProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressProviderError'
  }
}

export class WordPressConnectionError extends WordPressProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressConnectionError'
    this.category = 'connection'
  }
}

export class WordPressAuthenticationError extends WordPressProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressAuthenticationError'
    this.category = 'authentication'
  }
}

export class WordPressRateLimitError extends WordPressProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressRateLimitError'
    this.category = 'rate_limit'
  }
}

export class WordPressTimeoutError extends WordPressProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressTimeoutError'
    this.category = 'timeout'
  }
}

export class WordPressNotFoundError extends WordPressProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressNotFoundError'
    this.category = 'not_found'
  }
}

export class WordPressMappingError extends WordPressProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressMappingError'
    this.category = 'mapping'
  }
}

export class WordPressWebhookError extends WordPressProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressWebhookError'
    this.category = 'webhook'
  }
}

export class WordPressValidationError extends WordPressProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressValidationError'
    this.category = 'validation'
  }
}

export default WordPressProviderError
