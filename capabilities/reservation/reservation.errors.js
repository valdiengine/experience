export class ReservationError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'ReservationError'
    this.code = options.code || 'RESERVATION_ERROR'
    this.statusCode = options.statusCode || 500
  }
}

export class ReservationValidationError extends ReservationError {
  constructor(message, details = {}) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400 })
    this.name = 'ReservationValidationError'
    this.details = details
  }
}

export class ReservationPermissionError extends ReservationError {
  constructor(message) {
    super(message, { code: 'PERMISSION_DENIED', statusCode: 403 })
    this.name = 'ReservationPermissionError'
  }
}

export class ReservationNotFoundError extends ReservationError {
  constructor(identifier) {
    super(`Reservation not found: ${identifier}`, { code: 'NOT_FOUND', statusCode: 404 })
    this.name = 'ReservationNotFoundError'
    this.identifier = identifier
  }
}

export class ReservationConflictError extends ReservationError {
  constructor(message) {
    super(message, { code: 'CONFLICT', statusCode: 409 })
    this.name = 'ReservationConflictError'
  }
}

export class ReservationAvailabilityError extends ReservationError {
  constructor(message) {
    super(message, { code: 'AVAILABILITY_CONFLICT', statusCode: 409 })
    this.name = 'ReservationAvailabilityError'
  }
}

export class ReservationStateError extends ReservationError {
  constructor(message) {
    super(message, { code: 'INVALID_STATE', statusCode: 422 })
    this.name = 'ReservationStateError'
  }
}

export class ReservationPricingError extends ReservationError {
  constructor(message) {
    super(message, { code: 'PRICING_ERROR', statusCode: 422 })
    this.name = 'ReservationPricingError'
  }
}

export class ReservationRecoveryError extends ReservationError {
  constructor(message) {
    super(message, { code: 'RECOVERY_FAILED', statusCode: 500 })
    this.name = 'ReservationRecoveryError'
  }
}

export class ReservationTimeoutError extends ReservationError {
  constructor(message) {
    super(message, { code: 'TIMEOUT', statusCode: 408 })
    this.name = 'ReservationTimeoutError'
  }
}

export class ReservationOrphanError extends ReservationError {
  constructor(message) {
    super(message, { code: 'ORPHAN_RESERVATION', statusCode: 422 })
    this.name = 'ReservationOrphanError'
  }
}
