/**
 * Not Found Middleware
 *
 * Handles requests to undefined routes.
 *
 * P14 - API Layer Foundation
 */

import { problemDetails } from '../responses/problem-details.response.js';

/**
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function notFoundMiddleware(req, res, next) {
  const problem = problemDetails(
    'https://api.example.com/errors/not-found',
    'Endpoint Not Found',
    404,
    `The requested endpoint '${req.method} ${req.pathname}' does not exist.`,
    { instance: `urn:api:error:not-found:${req.method}:${req.pathname}` }
  );

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/problem+json');
  res.end(JSON.stringify(problem));
}
