/**
 * Business Routes
 *
 * Routes for Business endpoints.
 *
 * P14 - API Layer Foundation
 */

import { Router } from './router.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { BusinessController } from '../controllers/business.controller.js';

/**
 * @param {import('../routes/api.router.js').ApiRouter} router
 */
export function registerBusinessRoutes(router) {
  const businessRouter = new Router();
  const controller = new BusinessController();

  businessRouter.get('/', authMiddleware, controller.list.bind(controller));
  businessRouter.get('/:id', authMiddleware, controller.get.bind(controller));
  businessRouter.post('/', authMiddleware, controller.create.bind(controller));
  businessRouter.put('/:id', authMiddleware, controller.update.bind(controller));
  businessRouter.patch('/:id', authMiddleware, controller.patch.bind(controller));
  businessRouter.delete('/:id', authMiddleware, controller.delete.bind(controller));

  businessRouter.post('/:id/archive', authMiddleware, controller.archive.bind(controller));
  businessRouter.post('/:id/restore', authMiddleware, controller.restore.bind(controller));

  router.use('/api/v1/businesses', businessRouter);
}
