/**
 * Review Routes
 *
 * Routes for Review endpoints.
 *
 * P14 - API Layer Foundation
 */

import { Router } from './router.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * @param {import('../routes/api.router.js').ApiRouter} router
 */
export function registerReviewRoutes(router) {
  const reviewRouter = new Router();
  const controller = new ReviewController();

  reviewRouter.get('/', authMiddleware, controller.list.bind(controller));
  reviewRouter.get('/:id', authMiddleware, controller.get.bind(controller));
  reviewRouter.post('/', authMiddleware, controller.create.bind(controller));
  reviewRouter.patch('/:id', authMiddleware, controller.patch.bind(controller));
  reviewRouter.delete('/:id', authMiddleware, controller.delete.bind(controller));

  reviewRouter.post('/:id/approve', authMiddleware, controller.approve.bind(controller));
  reviewRouter.post('/:id/reject', authMiddleware, controller.reject.bind(controller));
  reviewRouter.post('/:id/report', authMiddleware, controller.report.bind(controller));

  router.use('/api/v1/reviews', reviewRouter);
}

/**
 * Review Controller
 */
export class ReviewController {
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
    const { page = 1, perPage = 20, accommodationId, businessId, status } = req.query;

    const result = await this.getService()?.listReviews({
      page: parseInt(page),
      perPage: parseInt(perPage),
      accommodationId,
      businessId,
      status,
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
    const review = await this.getService()?.getReview(req.params.id, {
      tenantId: req.user?.tenantId,
    });

    if (!review) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Review not found' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: review }));
  }

  async create(req, res) {
    const review = await this.getService()?.createReview(req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: review }));
  }

  async patch(req, res) {
    const review = await this.getService()?.updateReview(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: review }));
  }

  async delete(req, res) {
    await this.getService()?.deleteReview(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 204;
    res.end();
  }

  async approve(req, res) {
    const review = await this.getService()?.approveReview(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: review }));
  }

  async reject(req, res) {
    const review = await this.getService()?.rejectReview(req.params.id, req.body?.reason, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: review }));
  }

  async report(req, res) {
    const review = await this.getService()?.reportReview(req.params.id, req.body?.reason, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: review }));
  }
}
