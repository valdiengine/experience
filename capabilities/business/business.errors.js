export class BusinessError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'BusinessError'
    this.code = options.code || 'BUSINESS_ERROR'
    this.statusCode = options.statusCode || 500
  }
}

export class BusinessValidationError extends BusinessError {
  constructor(message, details = {}) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400 })
    this.name = 'BusinessValidationError'
    this.details = details
  }
}

export class BusinessPermissionError extends BusinessError {
  constructor(message) {
    super(message, { code: 'PERMISSION_DENIED', statusCode: 403 })
    this.name = 'BusinessPermissionError'
  }
}

export class BusinessNotFoundError extends BusinessError {
  constructor(identifier) {
    super(`Business not found: ${identifier}`, { code: 'NOT_FOUND', statusCode: 404 })
    this.name = 'BusinessNotFoundError'
    this.identifier = identifier
  }
}

export class BusinessConflictError extends BusinessError {
  constructor(message) {
    super(message, { code: 'CONFLICT', statusCode: 409 })
    this.name = 'BusinessConflictError'
  }
}

export class BusinessWorkflowError extends BusinessError {
  constructor(message) {
    super(message, { code: 'INVALID_TRANSITION', statusCode: 422 })
    this.name = 'BusinessWorkflowError'
  }
}

export class BusinessOrchestrationError extends BusinessError {
  constructor(message) {
    super(message, { code: 'ORCHESTRATION_ERROR', statusCode: 422 })
    this.name = 'BusinessOrchestrationError'
  }
}
