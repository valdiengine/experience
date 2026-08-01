export class OrmError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'OrmError'
    this.context = context
    this.timestamp = Date.now()
  }
}

export class OrmMappingError extends OrmError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'OrmMappingError'
    this.category = 'mapping'
  }
}

export class OrmQueryError extends OrmError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'OrmQueryError'
    this.category = 'query'
  }
}

export class OrmSchemaError extends OrmError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'OrmSchemaError'
    this.category = 'schema'
  }
}

export class OrmTransactionError extends OrmError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'OrmTransactionError'
    this.category = 'transaction'
  }
}

export class OrmConnectionError extends OrmError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'OrmConnectionError'
    this.category = 'connection'
  }
}

export class OrmConfigurationError extends OrmError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'OrmConfigurationError'
    this.category = 'configuration'
  }
}

export class OrmValidationError extends OrmError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'OrmValidationError'
    this.category = 'validation'
  }
}

export class OrmNotImplementedError extends OrmError {
  constructor(method, entityName) {
    super(`OrmAdapter#${method} not implemented for ${entityName}`, { method, entityName })
    this.name = 'OrmNotImplementedError'
    this.category = 'implementation'
  }
}

export class OrmProviderError extends OrmError {
  constructor(message, context = {}) {
    super(message, context)
    this.name = 'OrmProviderError'
    this.category = 'provider'
  }
}

export default OrmError
