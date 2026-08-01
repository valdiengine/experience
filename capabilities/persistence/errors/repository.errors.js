export class RepositoryError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'RepositoryError'
    this.code = context.code || 'REPOSITORY_ERROR'
    this.statusCode = context.statusCode || 500
    this.context = context
    this.timestamp = Date.now()
  }
}

export class RepositoryConfigurationError extends RepositoryError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'REPOSITORY_CONFIGURATION_ERROR', statusCode: 500 })
    this.name = 'RepositoryConfigurationError'
    this.category = 'configuration'
  }
}

export class RepositoryNotFoundError extends RepositoryError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'REPOSITORY_NOT_FOUND', statusCode: 404 })
    this.name = 'RepositoryNotFoundError'
    this.category = 'not-found'
  }
}

export class RepositoryValidationError extends RepositoryError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'REPOSITORY_VALIDATION_ERROR', statusCode: 400 })
    this.name = 'RepositoryValidationError'
    this.category = 'validation'
  }
}

export class RepositoryConcurrencyError extends RepositoryError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'REPOSITORY_CONCURRENCY_ERROR', statusCode: 409 })
    this.name = 'RepositoryConcurrencyError'
    this.category = 'concurrency'
  }
}

export class RepositoryTransactionError extends RepositoryError {
  constructor(message, context = {}) {
    super(message, { ...context, code: 'REPOSITORY_TRANSACTION_ERROR', statusCode: 500 })
    this.name = 'RepositoryTransactionError'
    this.category = 'transaction'
  }
}

export default RepositoryError
