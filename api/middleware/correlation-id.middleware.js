/**
 * Correlation ID Middleware
 *
 * Tracks request chains across services.
 *
 * P14 - API Layer Foundation
 */

/**
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function correlationIdMiddleware(req, res, next) {
  const existingId = req.headers['x-correlation-id'];
  const correlationId = existingId || `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  return next();
}
