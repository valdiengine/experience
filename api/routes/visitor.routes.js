/**
 * Visitor Routes
 *
 * Routes for Visitor endpoints.
 *
 * P14 - API Layer Foundation
 */

import { Router } from './router.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * @param {import('../routes/api.router.js').ApiRouter} router
 */
export function registerVisitorRoutes(router) {
  const visitorRouter = new Router();
  const controller = new VisitorController();

  visitorRouter.get('/', authMiddleware, controller.list.bind(controller));
  visitorRouter.get('/:id', authMiddleware, controller.get.bind(controller));
  visitorRouter.post('/', authMiddleware, controller.create.bind(controller));
  visitorRouter.put('/:id', authMiddleware, controller.update.bind(controller));
  visitorRouter.patch('/:id', authMiddleware, controller.patch.bind(controller));
  visitorRouter.delete('/:id', authMiddleware, controller.delete.bind(controller));

  visitorRouter.post('/:id/archive', authMiddleware, controller.archive.bind(controller));
  visitorRouter.post('/:id/restore', authMiddleware, controller.restore.bind(controller));
  visitorRouter.post('/:id/verify', authMiddleware, controller.verify.bind(controller));
  visitorRouter.post('/:id/merge', authMiddleware, controller.merge.bind(controller));

  router.use('/api/v1/visitors', visitorRouter);
}

/**
 * Visitor Controller
 */
export class VisitorController {
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
    const { page = 1, perPage = 20, businessId } = req.query;

    const result = await this.getService()?.listVisitors({
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
      pagination: { page: parseInt(page), perPage: parseInt(perPage), total: result.total },
    }));
  }

  async get(req, res) {
    const visitor = await this.getService()?.getVisitor(req.params.id, {
      tenantId: req.user?.tenantId,
    });

    if (!visitor) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Visitor not found' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: visitor }));
  }

  async create(req, res) {
    const visitor = await this.getService()?.createVisitor(req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: visitor }));
  }

  async update(req, res) {
    const visitor = await this.getService()?.updateVisitor(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: visitor }));
  }

  async patch(req, res) {
    const visitor = await this.getService()?.patchVisitor(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: visitor }));
  }

  async delete(req, res) {
    await this.getService()?.deleteVisitor(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 204;
    res.end();
  }

  async archive(req, res) {
    const visitor = await this.getService()?.archiveVisitor(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: visitor }));
  }

  async restore(req, res) {
    const visitor = await this.getService()?.restoreVisitor(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: visitor }));
  }

  async verify(req, res) {
    const visitor = await this.getService()?.verifyVisitor(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: visitor }));
  }

  async merge(req, res) {
    const { sourceId } = req.body;
    const visitor = await this.getService()?.mergeVisitors(req.params.id, sourceId, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: visitor }));
  }
}
