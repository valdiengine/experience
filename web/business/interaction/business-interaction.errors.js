/**
 * P15.11.1 — Business Interaction Core & Application Inbox Architecture
 *
 * Error types for BusinessInteraction operations.
 * Never expose internal paths or credentials.
 */

export const INTERACTION_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'INTERACTION_NOT_FOUND',
  INVALID_IDENTITY: 'INVALID_INTERACTION_IDENTITY',
  VALIDATION_ERROR: 'INTERACTION_VALIDATION_ERROR',
  ISOLATION_VIOLATION: 'INTERACTION_ISOLATION_VIOLATION',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL_DETECTED',
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  CONCURRENCY_ERROR: 'CONCURRENCY_ERROR',
  DUPLICATE_INTERACTION: 'DUPLICATE_INTERACTION',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INVALID_APPLICATION: 'INVALID_APPLICATION',
  PREVIEW_IN_PRODUCTION: 'PREVIEW_IN_PRODUCTION'
})

export class InteractionError extends Error {
  constructor(message, code = 'INTERACTION_ERROR') {
    super(message)
    this.name = 'InteractionError'
    this.code = code
  }
}

export class InteractionNotFoundError extends InteractionError {
  constructor(interactionId) {
    super(`Interaction not found: ${interactionId}`, INTERACTION_ERROR_CODES.NOT_FOUND)
    this.name = 'InteractionNotFoundError'
    this.interactionId = interactionId
  }
}

export class InvalidInteractionIdentityError extends InteractionError {
  constructor(reason) {
    super(`Invalid interaction identity: ${reason}`, INTERACTION_ERROR_CODES.INVALID_IDENTITY)
    this.name = 'InvalidInteractionIdentityError'
  }
}

export class InteractionValidationError extends InteractionError {
  constructor(reason) {
    super(`Interaction validation failed: ${reason}`, INTERACTION_ERROR_CODES.VALIDATION_ERROR)
    this.name = 'InteractionValidationError'
  }
}

export class InteractionIsolationViolationError extends InteractionError {
  constructor(reason) {
    super(`Interaction isolation violation: ${reason}`, INTERACTION_ERROR_CODES.ISOLATION_VIOLATION)
    this.name = 'InteractionIsolationViolationError'
  }
}

export class InvalidStatusTransitionError extends InteractionError {
  constructor(fromStatus, toStatus) {
    super(`Invalid status transition from ${fromStatus} to ${toStatus}`, INTERACTION_ERROR_CODES.INVALID_STATUS_TRANSITION)
    this.name = 'InvalidStatusTransitionError'
    this.fromStatus = fromStatus
    this.toStatus = toStatus
  }
}

export class InteractionPathTraversalError extends InteractionError {
  constructor(path) {
    super(`Path traversal detected: ${path}`, INTERACTION_ERROR_CODES.PATH_TRAVERSAL)
    this.name = 'InteractionPathTraversalError'
  }
}

export class InteractionSerializationError extends InteractionError {
  constructor(reason) {
    super(`Serialization error: ${reason}`, INTERACTION_ERROR_CODES.SERIALIZATION_ERROR)
    this.name = 'InteractionSerializationError'
  }
}

export class InteractionStorageError extends InteractionError {
  constructor(reason) {
    super(`Storage error: ${reason}`, INTERACTION_ERROR_CODES.STORAGE_ERROR)
    this.name = 'InteractionStorageError'
  }
}

export class InteractionConcurrencyError extends InteractionError {
  constructor(interactionId, reason) {
    super(`Concurrency error for ${interactionId}: ${reason}`, INTERACTION_ERROR_CODES.CONCURRENCY_ERROR)
    this.name = 'InteractionConcurrencyError'
    this.interactionId = interactionId
  }
}

export class DuplicateInteractionError extends InteractionError {
  constructor(interactionId) {
    super(`Duplicate interaction ID: ${interactionId}`, INTERACTION_ERROR_CODES.DUPLICATE_INTERACTION)
    this.name = 'DuplicateInteractionError'
    this.interactionId = interactionId
  }
}

export class PayloadTooLargeError extends InteractionError {
  constructor(size, maxSize) {
    super(`Payload too large: ${size} bytes (max: ${maxSize})`, INTERACTION_ERROR_CODES.PAYLOAD_TOO_LARGE)
    this.name = 'PayloadTooLargeError'
    this.size = size
    this.maxSize = maxSize
  }
}

export class InvalidApplicationError extends InteractionError {
  constructor(applicationId) {
    super(`Invalid application: ${applicationId}`, INTERACTION_ERROR_CODES.INVALID_APPLICATION)
    this.name = 'InvalidApplicationError'
    this.applicationId = applicationId
  }
}

export class PreviewInProductionError extends InteractionError {
  constructor() {
    super('Preview interactions cannot be stored in production', INTERACTION_ERROR_CODES.PREVIEW_IN_PRODUCTION)
    this.name = 'PreviewInProductionError'
  }
}

export default {
  INTERACTION_ERROR_CODES,
  InteractionError,
  InteractionNotFoundError,
  InvalidInteractionIdentityError,
  InteractionValidationError,
  InteractionIsolationViolationError,
  InvalidStatusTransitionError,
  InteractionPathTraversalError,
  InteractionSerializationError,
  InteractionStorageError,
  InteractionConcurrencyError,
  DuplicateInteractionError,
  PayloadTooLargeError,
  InvalidApplicationError,
  PreviewInProductionError
}
