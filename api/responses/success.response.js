/**
 * Success Response Envelope
 *
 * Standard response format for successful API responses.
 *
 * P14 - API Layer Foundation
 */

/**
 * @typedef {Object} ApiResponseMeta
 * @property {string} requestId
 * @property {number} timestamp
 * @property {string} version - API version
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {number} page
 * @property {number} perPage
 * @property {number} total
 * @property {number} totalPages
 */

/**
 * Create a success response envelope
 * @param {Object} data - Response data
 * @param {ApiResponseMeta} meta - Response metadata
 * @returns {Object}
 */
export function successEnvelope(data, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      requestId: meta.requestId || generateRequestId(),
      timestamp: meta.timestamp || Date.now(),
      version: meta.version || 'v1',
    },
  };
}

/**
 * Create a paginated success response envelope
 * @param {Object[]} items - Array of items
 * @param {PaginationMeta} pagination
 * @param {ApiResponseMeta} meta
 * @returns {Object}
 */
export function paginatedEnvelope(items, pagination, meta = {}) {
  return {
    success: true,
    data: items,
    pagination: {
      page: pagination.page,
      perPage: pagination.perPage,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.perPage),
    },
    meta: {
      requestId: meta.requestId || generateRequestId(),
      timestamp: meta.timestamp || Date.now(),
      version: meta.version || 'v1',
    },
  };
}

/**
 * Create a created response (201)
 * @param {Object} data
 * @param {string} location - Resource URL
 * @param {ApiResponseMeta} meta
 * @returns {Object}
 */
export function createdEnvelope(data, location, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      requestId: meta.requestId || generateRequestId(),
      timestamp: meta.timestamp || Date.now(),
      version: meta.version || 'v1',
      location,
    },
  };
}

/**
 * Create a no content response (204)
 * @param {ApiResponseMeta} meta
 * @returns {null}
 */
export function noContentEnvelope(meta = {}) {
  return null;
}

/**
 * Generate a unique request ID
 * @returns {string}
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
