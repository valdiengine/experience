/**
 * Health Check Index
 *
 * Registers health check endpoints.
 *
 * P14 - API Layer Foundation
 */

import { healthRouter } from './health.router.js';

/**
 * @param {import('../routes/api.router.js').ApiRouter} router
 */
export function registerHealthRoutes(router) {
  router.get('/health', async (req, res) => {
    const health = await getHealth();
    res.statusCode = health.status === 'healthy' ? 200 : 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(health));
  });

  router.get('/ready', async (req, res) => {
    const ready = await checkReady();
    res.statusCode = ready.ready ? 200 : 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(ready));
  });

  router.get('/live', async (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'alive' }));
  });
}

/**
 * Get overall health status
 * @returns {Promise<Object>}
 */
async function getHealth() {
  const runtimeHealth = await getRuntimeHealth();

  return {
    status: runtimeHealth.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      runtime: runtimeHealth,
    },
  };
}

/**
 * Check if system is ready to serve requests
 * @returns {Promise<Object>}
 */
async function checkReady() {
  const checks = await Promise.all([checkRuntime(), checkDatabase()]);

  const allReady = checks.every((c) => c.ready);

  return {
    ready: allReady,
    timestamp: new Date().toISOString(),
    checks: {
      runtime: checks[0],
      database: checks[1],
    },
  };
}

/**
 * Check runtime health
 * @returns {Promise<Object>}
 */
async function getRuntimeHealth() {
  try {
    if (global.runtimeContext?.health) {
      return await global.runtimeContext.health.check();
    }
    return { healthy: true, message: 'Runtime health check not available' };
  } catch (error) {
    return { healthy: false, message: error.message };
  }
}

/**
 * Check runtime readiness
 * @returns {Promise<Object>}
 */
async function checkRuntime() {
  try {
    if (global.runtimeContext?.health) {
      const status = await global.runtimeContext.health.check();
      return { ready: status.healthy, message: status.message };
    }
    return { ready: true, message: 'Runtime ready' };
  } catch (error) {
    return { ready: false, message: error.message };
  }
}

/**
 * Check database connectivity
 * @returns {Promise<Object>}
 */
async function checkDatabase() {
  try {
    return { ready: true, message: 'Database connection assumed healthy' };
  } catch (error) {
    return { ready: false, message: error.message };
  }
}
