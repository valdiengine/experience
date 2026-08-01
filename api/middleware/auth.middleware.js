/**
 * Authentication Middleware
 *
 * Validates authentication tokens using Runtime Auth.
 *
 * P14 - API Layer Foundation
 *
 * Note: This is a thin wrapper. Actual auth logic is in Runtime Auth.
 * This middleware only handles HTTP-specific concerns (header extraction, response).
 */

/**
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    req.authenticated = false;
    return next();
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme.toLowerCase() !== 'bearer' || !token) {
    req.user = null;
    req.authenticated = false;
    return next();
  }

  try {
    const decoded = await validateToken(token);
    req.user = decoded;
    req.authenticated = true;
  } catch (error) {
    req.user = null;
    req.authenticated = false;
  }

  next();
}

/**
 * Validate token using Runtime Auth
 * @param {string} token
 * @returns {Promise<Object>}
 */
async function validateToken(token) {
  if (!global.runtimeContext?.auth) {
    return { id: 'anonymous', roles: ['anonymous'] };
  }

  return await global.runtimeContext.auth.validateToken(token);
}

/**
 * Require authentication
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function requireAuth(req, res, next) {
  if (!req.authenticated || !req.user) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/problem+json');
    res.end(
      JSON.stringify({
        type: 'https://api.example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication is required to access this resource.',
        instance: `urn:api:error:unauthorized:${req.id}`,
      })
    );
    return;
  }
  next();
}

/**
 * Optional authentication
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function optionalAuth(req, res, next) {
  next();
}
