/**
 * Request ID Middleware
 *
 * Assigns a unique request ID to each request.
 *
 * P14 - API Layer Foundation
 */

/**
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function requestIdMiddleware(req, res, next) {
  const existingId = req.headers['x-request-id'];
  const requestId =
    existingId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  return next();
}
