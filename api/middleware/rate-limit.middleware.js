/**
 * Rate Limit Middleware
 *
 * Rate limiting interface.
 * Actual implementation can use Redis, in-memory, etc.
 *
 * P14 - API Layer Foundation
 */

/**
 * @typedef {Object} RateLimitConfig
 * @property {number} windowMs - Time window in milliseconds
 * @property {number} max - Max requests per window
 * @property {string} keyPrefix - Redis key prefix
 */

const DEFAULT_CONFIG = {
  windowMs: 60000,
  max: 100,
  keyPrefix: 'ratelimit',
};

const inMemoryStore = new Map();

/**
 * Rate limit middleware factory
 * @param {RateLimitConfig} config
 * @returns {Function}
 */
export function rateLimitMiddleware(config = {}) {
  const { windowMs, max, keyPrefix } = { ...DEFAULT_CONFIG, ...config };

  return async (req, res, next) => {
    const identifier = getIdentifier(req);
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();

    const record = getRecord(key);

    if (!record) {
      setRecord(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', (max - 1).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000).toString());
      return next();
    }

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
    } else {
      record.count++;
    }

    setRecord(key, record);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000).toString());

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.statusCode = 429;
      res.setHeader('Content-Type', 'application/problem+json');
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/rate-limit-exceeded',
          title: 'Too Many Requests',
          status: 429,
          detail: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
          instance: `urn:api:error:ratelimit:${req.id}`,
        })
      );
      return;
    }

    return next();
  };
}

/**
 * Get client identifier for rate limiting
 * @param {Object} req
 * @returns {string}
 */
function getIdentifier(req) {
  return req.user?.id || req.ip || req.headers['x-forwarded-for'] || 'anonymous';
}

/**
 * Get rate limit record from store
 * @param {string} key
 * @returns {Object|null}
 */
function getRecord(key) {
  return inMemoryStore.get(key) || null;
}

/**
 * Set rate limit record in store
 * @param {string} key
 * @param {Object} record
 */
function setRecord(key, record) {
  inMemoryStore.set(key, record);
}
