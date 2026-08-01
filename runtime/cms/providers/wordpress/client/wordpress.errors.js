import { WordPressProviderError } from '../errors/wordpress.provider.errors.js'

export class WordPressClientError extends WordPressProviderError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressClientError'
    this.category = 'client'
  }
}

export class WordPressRequestError extends WordPressClientError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressRequestError'
    this.category = 'request'
  }
}

export class WordPressResponseError extends WordPressClientError {
  constructor(message, statusCode, context = {}) {
    super(message, { ...context, statusCode })
    this.name = 'WordPressResponseError'
    this.category = 'response'
    this.statusCode = statusCode
  }
}

export class WordPressSerializationError extends WordPressClientError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'WordPressSerializationError'
    this.category = 'serialization'
  }
}

export default WordPressClientError
