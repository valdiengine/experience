/**
 * Problem Details Response
 *
 * RFC 9457 Problem Details for HTTP APIs
 *
 * P14 - API Layer Foundation
 */

/**
 * @typedef {Object} ProblemDetails
 * @property {string} type - URI identifying the problem type
 * @property {string} title - Brief description
 * @property {number} status - HTTP status code
 * @property {string} detail - Detailed explanation
 * @property {string} instance - URI of the specific occurrence
 */

/**
 * Create a Problem Details error response
 * @param {string} type - Problem type URI
 * @param {string} title - Brief description
 * @param {number} status - HTTP status code
 * @param {string} detail - Detailed explanation
 * @param {Object} [extra] - Additional fields
 * @returns {ProblemDetails}
 */
export function problemDetails(type, title, status, detail, extra = {}) {
  return {
    type,
    title,
    status,
    detail,
    instance: extra.instance || `urn:api:error:${type}`,
    ...extra,
  };
}

/**
 * Create validation error problem details
 * @param {Object[]} errors - Validation errors
 * @param {string} [instance]
 * @returns {ProblemDetails}
 */
export function validationError(errors, instance) {
  return problemDetails(
    'https://api.example.com/errors/validation-error',
    'Validation Error',
    422,
    'The request body contains validation errors.',
    {
      instance: instance || `urn:api:error:validation`,
      errors: errors.map((err) => ({
        field: err.field,
        message: err.message,
        code: err.code,
      })),
    }
  );
}

/**
 * Create not found problem details
 * @param {string} resource - Resource type
 * @param {string} id - Resource ID
 * @param {string} [instance]
 * @returns {ProblemDetails}
 */
export function notFoundError(resource, id, instance) {
  return problemDetails(
    'https://api.example.com/errors/not-found',
    `${resource} Not Found`,
    404,
    `The requested ${resource} with ID '${id}' was not found.`,
    { instance: instance || `urn:api:error:${resource}:${id}` }
  );
}

/**
 * Create unauthorized problem details
 * @param {string} [reason]
 * @param {string} [instance]
 * @returns {ProblemDetails}
 */
export function unauthorizedError(reason = 'Authentication is required.', instance) {
  return problemDetails(
    'https://api.example.com/errors/unauthorized',
    'Unauthorized',
    401,
    reason,
    { instance: instance || 'urn:api:error:unauthorized' }
  );
}

/**
 * Create forbidden problem details
 * @param {string} [reason]
 * @param {string} [instance]
 * @returns {ProblemDetails}
 */
export function forbiddenError(reason = 'You do not have permission.', instance) {
  return problemDetails(
    'https://api.example.com/errors/forbidden',
    'Forbidden',
    403,
    reason,
    { instance: instance || 'urn:api:error:forbidden' }
  );
}

/**
 * Create internal server error problem details
 * @param {string} [instance]
 * @returns {ProblemDetails}
 */
export function internalError(instance) {
  return problemDetails(
    'https://api.example.com/errors/internal-error',
    'Internal Server Error',
    500,
    'An unexpected error occurred.',
    { instance: instance || 'urn:api:error:internal' }
  );
}

/**
 * Create conflict problem details
 * @param {string} message
 * @param {string} [instance]
 * @returns {ProblemDetails}
 */
export function conflictError(message, instance) {
  return problemDetails(
    'https://api.example.com/errors/conflict',
    'Conflict',
    409,
    message,
    { instance: instance || 'urn:api:error:conflict' }
  );
}
