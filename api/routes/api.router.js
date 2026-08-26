/**
 * API Router
 *
 * Main router that aggregates all route files.
 *
 * P14 - API Layer Foundation
 */

import { Router } from './router.js';
import { registerVersioning } from '../versioning/index.js';
import { registerBusinessRoutes } from './business.routes.js';
import { registerAccommodationRoutes } from './accommodation.routes.js';
import { registerAvailabilityRoutes } from './availability.routes.js';
import { registerReservationRoutes } from './reservation.routes.js';
import { registerVisitorRoutes } from './visitor.routes.js';
import { registerPaymentRoutes } from './payment.routes.js';
import { registerReviewRoutes } from './review.routes.js';
import { registerQuoteRoutes } from './quote.routes.js';

export class ApiRouter {
  #router;

  constructor() {
    this.#router = new Router();
    this.#registerRoutes();
    registerVersioning(this.#router);
  }

  /**
   * @returns {Router}
   */
  getRouter() {
    return this.#router;
  }

  /**
   * Add a route
   * @param {string} method
   * @param {string} path
   * @param {Function} handler
   * @param  {...Function} middleware
   */
  addRoute(method, path, handler, ...middleware) {
    this.#router.addRoute(method, path, handler, ...middleware);
  }

  /**
   * Use middleware or mount sub-router at path
   * @param {string|Function} pathOrMiddleware
   * @param {Function} [middleware]
   */
  use(pathOrMiddleware, middleware) {
    if (typeof pathOrMiddleware === 'string') {
      this.#router.use(pathOrMiddleware, middleware);
    } else {
      this.#router.use(pathOrMiddleware);
    }
  }

  /**
   * Register all domain routes
   */
  #registerRoutes() {
    registerBusinessRoutes(this.#router);
    registerAccommodationRoutes(this.#router);
    registerAvailabilityRoutes(this.#router);
    registerReservationRoutes(this.#router);
    registerVisitorRoutes(this.#router);
    registerPaymentRoutes(this.#router);
    registerReviewRoutes(this.#router);
    registerQuoteRoutes(this.#router);
  }
}
