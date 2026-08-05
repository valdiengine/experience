/**
 * Authorization Middleware
 *
 * Checks permissions using Runtime Auth.
 *
 * P14 - API Layer Foundation
 *
 * Note: This is a thin wrapper. Actual authorization logic is in Runtime Auth.
 */

/**
 * Require specific permission
 * @param {string} permission - Permission string (e.g., 'business:read')
 * @returns {Function}
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/problem+json');
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication is required.',
          instance: `urn:api:error:unauthorized:${req.id}`,
        })
      );
      return;
    }

    const hasPermission = await checkPermission(req.user, permission);

    if (!hasPermission) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/problem+json');
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: `Permission '${permission}' is required to access this resource.`,
          instance: `urn:api:error:forbidden:${permission}:${req.id}`,
        })
      );
      return;
    }

    return next();
  };
}

/**
 * Require specific role
 * @param {string} role - Role string (e.g., 'admin', 'business:owner')
 * @returns {Function}
 */
export function requireRole(role) {
  return async (req, res, next) => {
    if (!req.user) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/problem+json');
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication is required.',
          instance: `urn:api:error:unauthorized:${req.id}`,
        })
      );
      return;
    }

    const hasRole = req.user.roles?.includes(role) || false;

    if (!hasRole) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/problem+json');
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: `Role '${role}' is required to access this resource.`,
          instance: `urn:api:error:forbidden:role:${role}:${req.id}`,
        })
      );
      return;
    }

    return next();
  };
}

/**
 * Check if user has permission
 * @param {Object} user
 * @param {string} permission
 * @returns {Promise<boolean>}
 */
async function checkPermission(user, permission) {
  if (!global.runtimeContext?.auth) {
    return true;
  }

  return await global.runtimeContext.auth.checkPermission(user, permission);
}
