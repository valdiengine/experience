export class AvailabilityError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'AvailabilityError'
    this.code = options.code || 'AVAILABILITY_ERROR'
    this.statusCode = options.statusCode || 500
  }
}

export class AvailabilityValidationError extends AvailabilityError {
  constructor(message, details = {}) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400 })
    this.name = 'AvailabilityValidationError'
    this.details = details
  }
}

export class AvailabilityPermissionError extends AvailabilityError {
  constructor(message) {
    super(message, { code: 'PERMISSION_DENIED', statusCode: 403 })
    this.name = 'AvailabilityPermissionError'
  }
}

export class AvailabilityNotFoundError extends AvailabilityError {
  constructor(identifier) {
    super(`Availability not found: ${identifier}`, { code: 'NOT_FOUND', statusCode: 404 })
    this.name = 'AvailabilityNotFoundError'
    this.identifier = identifier
  }
}

export class AvailabilityConflictError extends AvailabilityError {
  constructor(message) {
    super(message, { code: 'CONFLICT', statusCode: 409 })
    this.name = 'AvailabilityConflictError'
  }
}

export class AvailabilityOverlapError extends AvailabilityError {
  constructor(message) {
    super(message, { code: 'OVERLAP_DETECTED', statusCode: 409 })
    this.name = 'AvailabilityOverlapError'
  }
}

export class AvailabilityRuleError extends AvailabilityError {
  constructor(message) {
    super(message, { code: 'RULE_VIOLATION', statusCode: 422 })
    this.name = 'AvailabilityRuleError'
  }
}

export class AvailabilityCalendarError extends AvailabilityError {
  constructor(message) {
    super(message, { code: 'CALENDAR_ERROR', statusCode: 422 })
    this.name = 'AvailabilityCalendarError'
  }
}

export class AvailabilityOrphanError extends AvailabilityError {
  constructor(message) {
    super(message, { code: 'ORPHAN_AVAILABILITY', statusCode: 422 })
    this.name = 'AvailabilityOrphanError'
  }
}
