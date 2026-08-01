export class DrizzleError extends Error {
  constructor(message, context = {}) {
    super(message)
    this.name = 'DrizzleError'
    this.context = context
    this.timestamp = Date.now()
  }
}

export class DrizzleConnectionError extends DrizzleError {
  constructor(message, context = {}) { super(message, context); this.name = 'DrizzleConnectionError'; this.category = 'connection' }
}

export class DrizzleQueryError extends DrizzleError {
  constructor(message, context = {}) { super(message, context); this.name = 'DrizzleQueryError'; this.category = 'query' }
}

export class DrizzleTransactionError extends DrizzleError {
  constructor(message, context = {}) { super(message, context); this.name = 'DrizzleTransactionError'; this.category = 'transaction' }
}

export class DrizzleMigrationError extends DrizzleError {
  constructor(message, context = {}) { super(message, context); this.name = 'DrizzleMigrationError'; this.category = 'migration' }
}

export class DrizzleSchemaError extends DrizzleError {
  constructor(message, context = {}) { super(message, context); this.name = 'DrizzleSchemaError'; this.category = 'schema' }
}

export default DrizzleError
