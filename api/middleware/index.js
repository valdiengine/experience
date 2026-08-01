/**
 * Middleware Index
 *
 * Central registration point for all API middleware.
 *
 * P14 - API Layer Foundation
 */

import { requestIdMiddleware } from './request-id.middleware.js';
import { correlationIdMiddleware } from './correlation-id.middleware.js';
import { loggingMiddleware } from './logging.middleware.js';
import { errorHandlerMiddleware } from './error-handler.middleware.js';
import { notFoundMiddleware } from './not-found.middleware.js';
import { authMiddleware } from './auth.middleware.js';
import { authorizationMiddleware } from './authorization.middleware.js';
import { validationMiddleware } from './validation.middleware.js';
import { rateLimitMiddleware } from './rate-limit.middleware.js';

/**
 * Register all middleware with the API server
 * @param {import('../bootstrap/server/api.server.js').ApiServer} server
 */
export function registerMiddleware(server) {
  server.use(requestIdMiddleware);
  server.use(correlationIdMiddleware);
  server.use(loggingMiddleware);
  server.use(errorHandlerMiddleware);
  server.use(notFoundMiddleware);
}

export {
  requestIdMiddleware,
  correlationIdMiddleware,
  loggingMiddleware,
  errorHandlerMiddleware,
  notFoundMiddleware,
  authMiddleware,
  authorizationMiddleware,
  validationMiddleware,
  rateLimitMiddleware,
};
