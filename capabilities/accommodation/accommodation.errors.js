export class AccommodationError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'AccommodationError'
    this.code = options.code || 'ACCOMMODATION_ERROR'
    this.statusCode = options.statusCode || 500
  }
}

export class AccommodationValidationError extends AccommodationError {
  constructor(message, details = {}) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400 })
    this.name = 'AccommodationValidationError'
    this.details = details
  }
}

export class AccommodationPermissionError extends AccommodationError {
  constructor(message) {
    super(message, { code: 'PERMISSION_DENIED', statusCode: 403 })
    this.name = 'AccommodationPermissionError'
  }
}

export class AccommodationNotFoundError extends AccommodationError {
  constructor(identifier) {
    super(`Accommodation not found: ${identifier}`, { code: 'NOT_FOUND', statusCode: 404 })
    this.name = 'AccommodationNotFoundError'
    this.identifier = identifier
  }
}

export class AccommodationConflictError extends AccommodationError {
  constructor(message) {
    super(message, { code: 'CONFLICT', statusCode: 409 })
    this.name = 'AccommodationConflictError'
  }
}

export class AccommodationStateError extends AccommodationError {
  constructor(message) {
    super(message, { code: 'INVALID_STATE', statusCode: 422 })
    this.name = 'AccommodationStateError'
  }
}

export class AccommodationOrphanError extends AccommodationError {
  constructor(message) {
    super(message, { code: 'ORPHAN_ACCOMMODATION', statusCode: 422 })
    this.name = 'AccommodationOrphanError'
  }
}
