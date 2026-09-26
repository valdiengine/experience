/**
 * Quote Routes
 *
 * Public API endpoints for Quote operations.
 * These endpoints are rate-limited and do not require authentication
 * since they serve the public website quote forms.
 *
 * P15.11.3 — Quote Public API
 */

import { Router } from './router.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware.js';
import { createQuoteAPI } from '../../web/business/quote/api/quote.api.js';

const RATE_LIMIT_CONFIG = {
  windowMs: 60000,
  max: 30,
  keyPrefix: 'ratelimit:quote'
};

const PUBLIC_RATE_LIMIT_CONFIG = {
  windowMs: 60000,
  max: 10,
  keyPrefix: 'ratelimit:quote:public'
};

/**
 * @param {import('../routes/api.router.js').ApiRouter} router
 */
export function registerQuoteRoutes(router) {
  const quoteRouter = new Router();
  const quoteAPI = createQuoteAPI();

  quoteRouter.post(
    '/calculate',
    rateLimitMiddleware(PUBLIC_RATE_LIMIT_CONFIG),
    handleCalculate.bind(quoteRouter)
  );

  quoteRouter.post(
    '/',
    rateLimitMiddleware(RATE_LIMIT_CONFIG),
    handleSubmit.bind(quoteRouter)
  );

  quoteRouter.post(
    '/validate',
    rateLimitMiddleware(PUBLIC_RATE_LIMIT_CONFIG),
    handleValidate.bind(quoteRouter)
  );

  router.use('/api/v1/quotes', quoteRouter);
}

/**
 * Handle quote calculation request
 * POST /api/v1/quotes/calculate
 */
async function handleCalculate(req, res) {
  try {
    const body = await parseBody(req);
    const result = quoteAPI.handleCalculate(body);

    res.statusCode = result.status || (result.success ? 200 : 400);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Quote calculate error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: 'Internal server error',
      status: 500
    }));
  }
}

/**
 * Handle quote submission request
 * POST /api/v1/quotes
 */
async function handleSubmit(req, res) {
  try {
    const body = await parseBody(req);
    const context = {
      source: 'quote-public-api',
      requestId: req.headers['x-request-id'] || null,
      userAgent: req.headers['user-agent'] || null,
      origin: req.headers['origin'] || null
    };

    const result = await quoteAPI.handleSubmit(body, context);

    res.statusCode = result.status || (result.success ? 201 : 400);
    res.setHeader('Content-Type', 'application/json');
    if (result.success && result.data?.interactionId) {
      res.setHeader('X-Interaction-Id', result.data.interactionId);
    }
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Quote submit error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: 'Internal server error',
      status: 500
    }));
  }
}

/**
 * Handle quote validation request
 * POST /api/v1/quotes/validate
 */
async function handleValidate(req, res) {
  try {
    const body = await parseBody(req);
    const result = quoteAPI.handleValidate(body);

    res.statusCode = result.status || (result.success ? 200 : 400);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Quote validate error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: 'Internal server error',
      status: 500
    }));
  }
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({});
          return;
        }
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          resolve(JSON.parse(body));
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          resolve(parseFormData(body));
        } else {
          resolve({});
        }
      } catch (e) {
        reject(new Error('Invalid request body'));
      }
    });
    req.on('error', reject);
  });
}

function parseFormData(body) {
  const params = new URLSearchParams(body);
  const data = {};
  for (const [key, value] of params) {
    if (key.endsWith('[]')) {
      const arrayKey = key.slice(0, -2);
      if (!data[arrayKey]) {
        data[arrayKey] = [];
      }
      data[arrayKey].push(value);
    } else {
      data[key] = value;
    }
  }
  return data;
}

export default { registerQuoteRoutes };
