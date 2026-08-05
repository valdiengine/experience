/**
 * Accommodation Routes
 *
 * Routes for Accommodation endpoints.
 *
 * P14 - API Layer Foundation
 */

import { Router } from './router.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * @param {import('../routes/api.router.js').ApiRouter} router
 */
export function registerAccommodationRoutes(router) {
  const accommodationRouter = new Router();
  const controller = new AccommodationController();

  accommodationRouter.get('/', authMiddleware, controller.list.bind(controller));
  accommodationRouter.get('/:id', authMiddleware, controller.get.bind(controller));
  accommodationRouter.post('/', authMiddleware, controller.create.bind(controller));
  accommodationRouter.put('/:id', authMiddleware, controller.update.bind(controller));
  accommodationRouter.patch('/:id', authMiddleware, controller.patch.bind(controller));
  accommodationRouter.delete('/:id', authMiddleware, controller.delete.bind(controller));

  accommodationRouter.post('/:id/archive', authMiddleware, controller.archive.bind(controller));
  accommodationRouter.post('/:id/restore', authMiddleware, controller.restore.bind(controller));
  accommodationRouter.post('/:id/publish', authMiddleware, controller.publish.bind(controller));
  accommodationRouter.post('/:id/unpublish', authMiddleware, controller.unpublish.bind(controller));

  router.use('/api/v1/accommodations', accommodationRouter);
}

/**
 * Accommodation Controller
 */
export class AccommodationController {
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
    const { page = 1, perPage = 20 } = req.query;
    const businessId = req.query.businessId;

    const result = await this.getService()?.listAccommodations({
      page: parseInt(page),
      perPage: parseInt(perPage),
      businessId,
      tenantId: req.user?.tenantId,
    }) || { items: [], total: 0 };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      data: result.items,
      pagination: {
        page: parseInt(page),
        perPage: parseInt(perPage),
        total: result.total,
        totalPages: Math.ceil(result.total / perPage),
      },
    }));
  }

  async get(req, res) {
    const accommodation = await this.getService()?.getAccommodation(req.params.id, {
      tenantId: req.user?.tenantId,
    });

    if (!accommodation) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Accommodation not found' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: accommodation }));
  }

  async create(req, res) {
    const accommodation = await this.getService()?.createAccommodation(req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: accommodation }));
  }

  async update(req, res) {
    const accommodation = await this.getService()?.updateAccommodation(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: accommodation }));
  }

  async patch(req, res) {
    const accommodation = await this.getService()?.patchAccommodation(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: accommodation }));
  }

  async delete(req, res) {
    await this.getService()?.deleteAccommodation(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 204;
    res.end();
  }

  async archive(req, res) {
    const accommodation = await this.getService()?.archiveAccommodation(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: accommodation }));
  }

  async restore(req, res) {
    const accommodation = await this.getService()?.restoreAccommodation(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: accommodation }));
  }

  async publish(req, res) {
    const accommodation = await this.getService()?.publishAccommodation(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: accommodation }));
  }

  async unpublish(req, res) {
    const accommodation = await this.getService()?.unpublishAccommodation(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: accommodation }));
  }
}
