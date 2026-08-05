/**
 * Validation Middleware
 *
 * HTTP-level request validation.
 * Delegates to validation schemas in ../validation/
 *
 * P14 - API Layer Foundation
 */

/**
 * Validate request body against a schema
 * @param {Object} schema - Validation schema
 * @returns {Function}
 */
export function validateBody(schema) {
  return async (req, res, next) => {
    if (!req.body) {
      req.validationErrors = [];
      return next();
    }

    const errors = validate(schema, req.body);
    req.validationErrors = errors;

    if (errors.length > 0) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/problem+json');
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/validation-error',
          title: 'Validation Error',
          status: 422,
          detail: 'The request body contains validation errors.',
          instance: `urn:api:error:validation:${req.id}`,
          errors: errors.map((err) => ({
            field: err.path,
            message: err.message,
            code: err.code,
          })),
        })
      );
      return;
    }

    return next();
  };
}

/**
 * Validate request query against a schema
 * @param {Object} schema - Validation schema
 * @returns {Function}
 */
export function validateQuery(schema) {
  return async (req, res, next) => {
    const errors = validate(schema, req.query);
    req.queryValidationErrors = errors;

    if (errors.length > 0) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/problem+json');
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/validation-error',
          title: 'Validation Error',
          status: 422,
          detail: 'The request query contains validation errors.',
          instance: `urn:api:error:validation:query:${req.id}`,
          errors: errors.map((err) => ({
            field: err.path,
            message: err.message,
            code: err.code,
          })),
        })
      );
      return;
    }

    return next();
  };
}

/**
 * Validate request params
 * @param {Object} schema - Validation schema
 * @returns {Function}
 */
export function validateParams(schema) {
  return async (req, res, next) => {
    const errors = validate(schema, req.params);
    req.paramsValidationErrors = errors;

    if (errors.length > 0) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/problem+json');
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/validation-error',
          title: 'Validation Error',
          status: 422,
          detail: 'The request parameters contain validation errors.',
          instance: `urn:api:error:validation:params:${req.id}`,
          errors: errors.map((err) => ({
            field: err.path,
            message: err.message,
            code: err.code,
          })),
        })
      );
      return;
    }

    return next();
  };
}

/**
 * Simple validation function
 * @param {Object} schema
 * @param {Object} data
 * @returns {Object[]}
 */
function validate(schema, data) {
  const errors = [];

  if (!schema || !data) return errors;

  const { type, properties, required = [], minLength, maxLength, minimum, maximum, pattern } = schema;

  if (type === 'object' && data !== null && typeof data === 'object') {
    for (const field of required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push({
          path: field,
          message: `Field '${field}' is required.`,
          code: 'REQUIRED',
        });
      }
    }

    if (properties) {
      for (const [key, propSchema] of Object.entries(properties)) {
        const value = data[key];
        if (value !== undefined && value !== null) {
          errors.push(...validate(propSchema, value));
        }
      }
    }
  }

  if (type === 'string') {
    if (minLength && data.length < minLength) {
      errors.push({
        path: '',
        message: `Minimum length is ${minLength}.`,
        code: 'MIN_LENGTH',
      });
    }
    if (maxLength && data.length > maxLength) {
      errors.push({
        path: '',
        message: `Maximum length is ${maxLength}.`,
        code: 'MAX_LENGTH',
      });
    }
    if (pattern && !new RegExp(pattern).test(data)) {
      errors.push({
        path: '',
        message: `Invalid format.`,
        code: 'PATTERN',
      });
    }
  }

  if (type === 'number') {
    if (minimum !== undefined && data < minimum) {
      errors.push({
        path: '',
        message: `Minimum value is ${minimum}.`,
        code: 'MINIMUM',
      });
    }
    if (maximum !== undefined && data > maximum) {
      errors.push({
        path: '',
        message: `Maximum value is ${maximum}.`,
        code: 'MAXIMUM',
      });
    }
  }

  return errors;
}
