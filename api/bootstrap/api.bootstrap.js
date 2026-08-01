/**
 * API Layer Bootstrap
 *
 * Single entry point for the REST API layer.
 * Initializes the HTTP server, registers middleware, routes, and starts listening.
 *
 * P14 - API Layer Foundation
 */

import { ApiServer } from './server/api.server.js';
import { ApiRouter } from '../routes/api.router.js';
import { registerMiddleware } from '../middleware/index.js';
import { registerVersioning } from '../versioning/index.js';
import { registerOpenAPI } from '../openapi/index.js';
import { registerHealthRoutes } from '../health/index.js';
import { registerBusinessRoutes } from '../routes/business.routes.js';
import { registerAccommodationRoutes } from '../routes/accommodation.routes.js';
import { registerAvailabilityRoutes } from '../routes/availability.routes.js';
import { registerReservationRoutes } from '../routes/reservation.routes.js';
import { registerVisitorRoutes } from '../routes/visitor.routes.js';
import { registerPaymentRoutes } from '../routes/payment.routes.js';
import { registerNotificationRoutes } from '../routes/notification.routes.js';

/**
 * @typedef {Object} ApiBootstrapConfig
 * @property {number} port - HTTP server port
 * @property {string} host - HTTP server host
 * @property {string} env - Environment (development, staging, production)
 */

const DEFAULT_CONFIG = {
  port: process.env.API_PORT || 3000,
  host: process.env.API_HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
};

/**
 * Initialize and start the API server
 * @param {ApiBootstrapConfig} config - Optional configuration overrides
 * @returns {Promise<ApiServer>}
 */
export async function bootstrapApi(config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const server = new ApiServer(finalConfig);

  await server.initialize();

  registerMiddleware(server);
  registerVersioning(server);
  registerOpenAPI(server);

  const router = new ApiRouter();
  server.use(router.getRouter());

  registerHealthRoutes(router);
  registerBusinessRoutes(router);
  registerAccommodationRoutes(router);
  registerAvailabilityRoutes(router);
  registerReservationRoutes(router);
  registerVisitorRoutes(router);
  registerPaymentRoutes(router);
  registerNotificationRoutes(router);

  await server.start();

  console.log(`API Server running on ${finalConfig.host}:${finalConfig.port}`);

  return server;
}

/**
 * Shutdown the API server gracefully
 * @param {ApiServer} server
 */
export async function shutdownApi(server) {
  await server.shutdown();
  console.log('API Server shutdown complete');
}

export default { bootstrapApi, shutdownApi };
