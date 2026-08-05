/**
 * Availability Routes
 *
 * Routes for Availability endpoints.
 *
 * P14 - API Layer Foundation
 */

import { Router } from './router.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * @param {import('../routes/api.router.js').ApiRouter} router
 */
export function registerAvailabilityRoutes(router) {
  const availabilityRouter = new Router();
  const controller = new AvailabilityController();

  availabilityRouter.get('/', authMiddleware, controller.list.bind(controller));
  availabilityRouter.get('/:id', authMiddleware, controller.get.bind(controller));
  availabilityRouter.post('/', authMiddleware, controller.create.bind(controller));
  availabilityRouter.put('/:id', authMiddleware, controller.update.bind(controller));
  availabilityRouter.delete('/:id', authMiddleware, controller.delete.bind(controller));

  availabilityRouter.post('/:id/block', authMiddleware, controller.block.bind(controller));
  availabilityRouter.post('/:id/unblock', authMiddleware, controller.unblock.bind(controller));
  availabilityRouter.post('/:id/reserve', authMiddleware, controller.reserve.bind(controller));
  availabilityRouter.post('/:id/release', authMiddleware, controller.release.bind(controller));

  router.use('/api/v1/availability', availabilityRouter);
}

/**
 * Availability Controller
 */
export class AvailabilityController {
  /** @type {Object|null} */
  #service = null;

  getService() {
    if (!this.#service) {
      const capability = global.runtimeContext?.capabilities?.get('business');
      this.#service = capability?.service;
    }
    return this.#service;
  }

  async list(req, res) {
    const { accommodationId, startDate, endDate } = req.query;

    const result = await this.getService()?.listAvailability({
      accommodationId,
      startDate,
      endDate,
      tenantId: req.user?.tenantId,
    }) || { items: [], total: 0 };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: result.items }));
  }

  async get(req, res) {
    const availability = await this.getService()?.getAvailability(req.params.id, {
      tenantId: req.user?.tenantId,
    });

    if (!availability) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Availability not found' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: availability }));
  }

  async create(req, res) {
    const availability = await this.getService()?.createAvailability(req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: availability }));
  }

  async update(req, res) {
    const availability = await this.getService()?.updateAvailability(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: availability }));
  }

  async delete(req, res) {
    await this.getService()?.deleteAvailability(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 204;
    res.end();
  }

  async block(req, res) {
    const availability = await this.getService()?.blockDate(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: availability }));
  }

  async unblock(req, res) {
    const availability = await this.getService()?.unblockDate(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: availability }));
  }

  async reserve(req, res) {
    const availability = await this.getService()?.reserveDate(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: availability }));
  }

  async release(req, res) {
    const availability = await this.getService()?.releaseDate(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: availability }));
  }
}
