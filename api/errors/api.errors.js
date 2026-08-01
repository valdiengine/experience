/**
 * API Error Classes
 *
 * Standardized error classes for API layer.
 * Translates domain errors to HTTP responses.
 *
 * P14 - API Layer Foundation
 */

/**
 * Base API Error
 */
export class ApiError extends Error {
  /** @type {number} */
  statusCode;
  /** @type {string} */
  code;
  /** @type {Object} */
  details;

  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} code
   * @param {Object} [details]
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Bad Request (400)
 */
export class BadRequestError extends ApiError {
  constructor(message, code = 'BAD_REQUEST', details = null) {
    super(message, 400, code, details);
    this.name = 'BadRequestError';
  }
}

/**
 * Unauthorized (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED', details = null) {
    super(message, 401, code, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Permission denied', code = 'FORBIDDEN', details = null) {
    super(message, 403, code, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found (404)
 */
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource', id = '', code = 'NOT_FOUND') {
    super(`${resource} '${id}' not found`, 404, code);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict (409)
 */
export class ConflictError extends ApiError {
  constructor(message, code = 'CONFLICT', details = null) {
    super(message, 409, code, details);
    this.name = 'ConflictError';
  }
}

/**
 * Unprocessable Entity (422)
 */
export class ValidationError extends ApiError {
  /**
   * @param {Object[]} errors
   */
  constructor(errors) {
    super('Validation failed', 422, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationError';
  }
}

/**
 * Too Many Requests (429)
 */
export class RateLimitError extends ApiError {
  /** @type {number} */
  retryAfter;

  /**
   * @param {number} retryAfter - Seconds until retry
   */
  constructor(retryAfter = 60) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalError extends ApiError {
  constructor(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    super(message, 500, code);
    this.name = 'InternalError';
  }
}

/**
 * Service Unavailable (503)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable', retryAfter = 30) {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
    this.retryAfter = retryAfter;
  }
}
