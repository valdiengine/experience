/**
 * Payment Routes
 *
 * Routes for Payment endpoints.
 *
 * P14 - API Layer Foundation
 */

import { Router } from '../router.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * @param {import('../routes/api.router.js').ApiRouter} router
 */
export function registerPaymentRoutes(router) {
  const paymentRouter = new Router();
  const controller = new PaymentController();

  paymentRouter.get('/', authMiddleware, controller.list.bind(controller));
  paymentRouter.get('/:id', authMiddleware, controller.get.bind(controller));
  paymentRouter.post('/', authMiddleware, controller.create.bind(controller));
  paymentRouter.patch('/:id', authMiddleware, controller.patch.bind(controller));

  paymentRouter.post('/:id/process', authMiddleware, controller.process.bind(controller));
  paymentRouter.post('/:id/refund', authMiddleware, controller.refund.bind(controller));
  paymentRouter.post('/:id/retry', authMiddleware, controller.retry.bind(controller));
  paymentRouter.post('/:id/cancel', authMiddleware, controller.cancel.bind(controller));

  router.use('/api/v1/payments', paymentRouter.handle.bind(paymentRouter));
}

/**
 * Payment Controller
 */
export class PaymentController {
  /** @type {Object|null} */
  #service = null;

  getService() {
    if (!this.#service) {
      const businessService = global.runtimeContext?.capabilities?.get('business');
      this.#service = businessService?.getPaymentService?.() || businessService;
    }
    return this.#service;
  }

  async list(req, res) {
    const { page = 1, perPage = 20, reservationId, status } = req.query;

    const result = await this.getService()?.listPayments({
      page: parseInt(page),
      perPage: parseInt(perPage),
      reservationId,
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
    const payment = await this.getService()?.getPayment(req.params.id, {
      tenantId: req.user?.tenantId,
    });

    if (!payment) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Payment not found' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: payment }));
  }

  async create(req, res) {
    const payment = await this.getService()?.createPayment(req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: payment }));
  }

  async patch(req, res) {
    const payment = await this.getService()?.updatePayment(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: payment }));
  }

  async process(req, res) {
    const payment = await this.getService()?.processPayment(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: payment }));
  }

  async refund(req, res) {
    const payment = await this.getService()?.refundPayment(req.params.id, req.body?.amount, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: payment }));
  }

  async retry(req, res) {
    const payment = await this.getService()?.retryPayment(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: payment }));
  }

  async cancel(req, res) {
    const payment = await this.getService()?.cancelPayment(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: payment }));
  }
}
