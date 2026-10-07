
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
 * CANCEL-TIMEOUT-REMEDIATION-2: what the middleware concluded about the request.
 *
 * `anonymous`   - no usable `Authorization: Bearer` credential was presented.
 * `authenticated` - a credential verified and produced an identity.
 * `rejected`    - a credential WAS presented and the runtime refused it.
 *
 * The distinction is the whole point of this slice. `anonymous` and `rejected`
 * used to be the same observable state (`req.user === null`), which is how an
 * invalid or expired token became an anonymous request and then an unscoped
 * business operation. `requireAuth` refuses both; the outcome and the bounded
 * `authReasonClass` exist so an operator can tell them apart without ever
 * logging the credential.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    setAuthOutcome(req, 'anonymous', null);
    req.user = null;
    req.authenticated = false;
    return next();
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme.toLowerCase() !== 'bearer' || !token) {
    setAuthOutcome(req, 'anonymous', null);
    req.user = null;
    req.authenticated = false;
    return next();
  }


  if (!global.runtimeContext?.auth) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/problem+json');
    res.end(
      JSON.stringify({
        type: 'https://api.example.com/errors/infrastructure-unavailable',
        title: 'Service Unavailable',
        status: 503,
        detail: 'Authentication service is not available.',
        instance: `urn:api:error:auth-unavailable:${req.id}`,
      })
    );
    return;
  }

  // CANCEL-TIMEOUT-REMEDIATION-2: a credential was presented, so the outcome can
  // no longer be anonymous-by-absence. `authenticate()` is preferred because it
  // returns the provider's bounded reason class alongside the identity;
  // `validateToken()` remains the fallback so runtimes that expose only the
  // older contract keep working unchanged.
  let decoded = null;
  let reasonClass = null;

  try {
    const authRuntime = global.runtimeContext.auth;
    if (typeof authRuntime.authenticate === 'function') {
      const result = await authRuntime.authenticate(token);
      decoded = result?.identity ?? null;
      reasonClass = typeof result?.reason === 'string' ? result.reason : null;
      if (!decoded && reasonClass === null) {
        // A runtime that reports neither an identity nor a reason still told us
        // the credential was refused, which is the fact that matters.
        reasonClass = 'OTHER_REJECTED';
      }
    } else {
      decoded = await authRuntime.validateToken(token);
      if (!decoded) {
        reasonClass = 'OTHER_REJECTED';
      }
    }
  } catch (error) {
    decoded = null;
    reasonClass = 'OTHER_REJECTED';
  }


  req.user = decoded;
  req.authenticated = Boolean(decoded);

  if (decoded) {
    // Recorded only when a tenant is actually resolved, so the marker answers
    // "did the tenant bind?" without carrying the tenant itself.
    if (decoded?.tenant?.id) {
    }
    setAuthOutcome(req, 'authenticated', null);
  } else {
    // A presented-but-refused credential is NOT anonymous. Recording it as such
    // is what allowed the cancel route to fall through to its unscoped branch.
    setAuthOutcome(req, 'rejected', reasonClass);
  }

  await next();
}

/**
 * Record the bounded auth conclusion on the request.
 *
 * Nothing derived from the credential is stored: only the outcome, and a reason
 * class drawn from a closed vocabulary. The token, its fragments, the
 * `Authorization` header, the secret, the tenant id and any error message are
 * never read here.
 *
 * @param {Object} req
 * @param {'anonymous'|'authenticated'|'rejected'} outcome
 * @param {string|null} reasonClass
 */
function setAuthOutcome(req, outcome, reasonClass) {
  req.authOutcome = outcome;
  req.authReasonClass = reasonClass ?? null;
}

/**
 * Require authentication
 *
 * CANCEL-TIMEOUT-REMEDIATION-2: refuses BOTH `anonymous` and `rejected`. A
 * refused credential and an absent one are different facts and are kept
 * distinguishable in `req.authOutcome`, but neither may reach a protected
 * handler. The response body is a fixed string with no reason, no credential
 * and no identifier, so the guard cannot become an oracle for probing which
 * claim or which secret was wrong.
 *
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
  return next();
}

/**
 * Optional authentication
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export function optionalAuth(req, res, next) {
  return next();
}
