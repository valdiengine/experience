export class VisitorError extends Error {
  constructor(message, code = 'VISITOR_ERROR', details = null) {
    super(message)
    this.name = 'VisitorError'
    this.code = code
    this.details = details
  }
}

export class VisitorValidationError extends VisitorError {
  constructor(message, details = null) {
    super(message, 'VISITOR_VALIDATION_ERROR', details)
    this.name = 'VisitorValidationError'
  }
}

export class VisitorPermissionError extends VisitorError {
  constructor(message) {
    super(message, 'VISITOR_PERMISSION_ERROR')
    this.name = 'VisitorPermissionError'
  }
}

export class VisitorNotFoundError extends VisitorError {
  constructor(id) {
    super(`Visitor not found: ${id}`, 'VISITOR_NOT_FOUND')
    this.name = 'VisitorNotFoundError'
  }
}

export class VisitorConflictError extends VisitorError {
  constructor(message) {
    super(message, 'VISITOR_CONFLICT')
    this.name = 'VisitorConflictError'
  }
}

export class VisitorStateError extends VisitorError {
  constructor(message) {
    super(message, 'VISITOR_STATE_ERROR')
    this.name = 'VisitorStateError'
  }
}

export class VisitorBlacklistError extends VisitorError {
  constructor(message) {
    super(message, 'VISITOR_BLACKLIST_ERROR')
    this.name = 'VisitorBlacklistError'
  }
}

export class VisitorMergeError extends VisitorError {
  constructor(message) {
    super(message, 'VISITOR_MERGE_ERROR')
    this.name = 'VisitorMergeError'
  }
}
