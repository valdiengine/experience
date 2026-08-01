export class PostgresError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'PostgresError'
    this.context = context
    this.timestamp = Date.now()
  }
}

export class PostgresConnectionError extends PostgresError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PostgresConnectionError'
    this.category = 'connection'
  }
}

export class PostgresPoolError extends PostgresError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PostgresPoolError'
    this.category = 'pool'
  }
}

export class PostgresMigrationError extends PostgresError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PostgresMigrationError'
    this.category = 'migration'
  }
}

export class PostgresConfigurationError extends PostgresError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PostgresConfigurationError'
    this.category = 'configuration'
  }
}

export class PostgresSSLConfigurationError extends PostgresError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PostgresSSLConfigurationError'
    this.category = 'ssl'
  }
}

export class PostgresProviderUnavailableError extends PostgresError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PostgresProviderUnavailableError'
    this.category = 'availability'
  }
}

export class PostgresTimeoutError extends PostgresError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PostgresTimeoutError'
    this.category = 'timeout'
  }
}

export class PostgresRetryExceededError extends PostgresError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'PostgresRetryExceededError'
    this.category = 'retry'
  }
}

export default PostgresError
