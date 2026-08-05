/**
 * Logging Middleware
 *
 * Logs incoming requests and outgoing responses.
 *
 * P14 - API Layer Foundation
 */

const LOG_LEVELS = {
  GET: 'info',
  POST: 'info',
  PUT: 'info',
  PATCH: 'info',
  DELETE: 'warn',
};

/**
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function loggingMiddleware(req, res, next) {
  const start = Date.now();
  const { method, pathname } = req;

  console.log(`[${new Date().toISOString()}] ${method} ${pathname} - Started`, {
    requestId: req.id,
    correlationId: req.correlationId,
  });

  if (res.on) {
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = LOG_LEVELS[method] || 'info';

      console.log(
        `[${new Date().toISOString()}] ${method} ${pathname} - ${res.statusCode} (${duration}ms)`,
        {
          requestId: req.id,
          correlationId: req.correlationId,
          statusCode: res.statusCode,
          duration,
        }
      );
    });
  }

  return next();
}
