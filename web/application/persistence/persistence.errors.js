/**
 * Persistence Errors
 *
 * P15.9.6 - Application Builder Persistence Implementation
 *
 * Safe error types that never expose internal paths or credentials.
 */

export const PERSISTENCE_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'APPLICATION_NOT_FOUND',
  INVALID_IDENTITY: 'INVALID_IDENTITY',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  ISOLATION_VIOLATION: 'ISOLATION_VIOLATION',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL_DETECTED'
})

export class PersistenceError extends Error {
  constructor(message, code = 'PERSISTENCE_ERROR') {
    super(message)
    this.name = 'PersistenceError'
    this.code = code
  }
}

export class ApplicationNotFoundError extends PersistenceError {
  constructor(applicationId) {
    super(`Application not found: ${applicationId}`, PERSISTENCE_ERROR_CODES.NOT_FOUND)
    this.name = 'ApplicationNotFoundError'
  }
}

export class VersionNotFoundError extends PersistenceError {
  constructor(applicationId, versionId) {
    super(`Version ${versionId} not found for application: ${applicationId}`, PERSISTENCE_ERROR_CODES.NOT_FOUND)
    this.name = 'VersionNotFoundError'
  }
}

export class DraftNotFoundError extends PersistenceError {
  constructor(applicationId) {
    super(`Draft not found for application: ${applicationId}`, PERSISTENCE_ERROR_CODES.NOT_FOUND)
    this.name = 'DraftNotFoundError'
  }
}

export class InvalidIdentityError extends PersistenceError {
  constructor(reason) {
    super(`Invalid application identity: ${reason}`, PERSISTENCE_ERROR_CODES.INVALID_IDENTITY)
    this.name = 'InvalidIdentityError'
  }
}

export class VersionConflictError extends PersistenceError {
  constructor(reason) {
    super(`Version conflict: ${reason}`, PERSISTENCE_ERROR_CODES.VERSION_CONFLICT)
    this.name = 'VersionConflictError'
  }
}

export class IsolationViolationError extends PersistenceError {
  constructor(reason) {
    super(`Isolation violation: ${reason}`, PERSISTENCE_ERROR_CODES.ISOLATION_VIOLATION)
    this.name = 'IsolationViolationError'
  }
}

export class PathTraversalError extends PersistenceError {
  constructor(path) {
    super(`Path traversal detected: ${path}`, PERSISTENCE_ERROR_CODES.PATH_TRAVERSAL)
    this.name = 'PathTraversalError'
  }
}

export class SerializationError extends PersistenceError {
  constructor(reason) {
    super(`Serialization error: ${reason}`, PERSISTENCE_ERROR_CODES.SERIALIZATION_ERROR)
    this.name = 'SerializationError'
  }
}

export class StorageError extends PersistenceError {
  constructor(reason) {
    super(`Storage error: ${reason}`, PERSISTENCE_ERROR_CODES.STORAGE_ERROR)
    this.name = 'StorageError'
  }
}

export default {
  PERSISTENCE_ERROR_CODES,
  PersistenceError,
  ApplicationNotFoundError,
  VersionNotFoundError,
  DraftNotFoundError,
  InvalidIdentityError,
  VersionConflictError,
  IsolationViolationError,
  PathTraversalError,
  SerializationError,
  StorageError
}
