/**
 * Error Handler Middleware
 *
 * Translates errors to HTTP responses with Problem Details format.
 *
 * P14 - API Layer Foundation
 */

import { ApiError } from '../errors/api.errors.js';
import { problemDetails, validationError, internalError } from '../responses/problem-details.response.js';

/**
 * @param {Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function errorHandlerMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    const problem = problemDetails(
      `https://api.example.com/errors/${err.code.toLowerCase()}`,
      err.message,
      err.statusCode,
      err.message,
      { instance: `urn:api:error:${err.code}` }
    );

    if (err instanceof ApiError && err.details) {
      problem.errors = err.details;
    }

    res.statusCode = err.statusCode;
    res.setHeader('Content-Type', 'application/problem+json');
    res.end(JSON.stringify(problem));
    return;
  }

  if (err.name === 'ValidationError' && err.errors) {
    const problem = validationError(err.errors, `urn:api:error:validation:${req.id}`);
    res.statusCode = 422;
    res.setHeader('Content-Type', 'application/problem+json');
    res.end(JSON.stringify(problem));
    return;
  }

  console.error(`Unhandled error:`, {
    requestId: req.id,
    correlationId: req.correlationId,
    error: err.message,
    stack: err.stack,
  });

  const problem = internalError(`urn:api:error:internal:${req.id}`);
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/problem+json');
  res.end(JSON.stringify(problem));
}
