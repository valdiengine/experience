/**
 * Base Controller
 *
 * Common controller functionality.
 *
 * P14 - API Layer Foundation
 */

import { successEnvelope, paginatedEnvelope, createdEnvelope } from '../responses/success.response.js';
import { NotFoundError, BadRequestError } from '../errors/api.errors.js';

/**
 * Base class for all controllers
 * Provides common response formatting and error handling.
 */
export class BaseController {
  /**
   * Send success response
   * @param {Object} res
   * @param {Object} data
   * @param {Object} [meta]
   */
  success(res, data, meta) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(successEnvelope(data, meta)));
  }

  /**
   * Send created response (201)
   * @param {Object} res
   * @param {Object} data
   * @param {string} location
   * @param {Object} [meta]
   */
  created(res, data, location, meta) {
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Location', location);
    res.end(JSON.stringify(createdEnvelope(data, location, meta)));
  }

  /**
   * Send no content response (204)
   * @param {Object} res
   */
  noContent(res) {
    res.statusCode = 204;
    res.end();
  }

  /**
   * Send paginated response
   * @param {Object} res
   * @param {Object[]} items
   * @param {Object} pagination
   * @param {Object} [meta]
   */
  paginated(res, items, pagination, meta) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(paginatedEnvelope(items, pagination, meta)));
  }

  /**
   * Get pagination params from request
   * @param {Object} req
   * @returns {{ page: number, perPage: number }}
   */
  getPagination(req) {
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.perPage) || 20, 100);
    return { page, perPage };
  }

  /**
   * Translate domain error to HTTP error
   * @param {Error} error
   * @returns {Error}
   */
  translateError(error) {
    if (error.code === 'NOT_FOUND') {
      return new NotFoundError(error.entity || 'Resource', error.id || 'unknown');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return error;
    }
    if (error.code === 'UNAUTHORIZED') {
      return new NotFoundError('Unauthorized', error.message);
    }
    return error;
  }
}
