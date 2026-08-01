/**
 * Reservation Routes
 *
 * Routes for Reservation endpoints.
 *
 * P14 - API Layer Foundation
 */

import { Router } from '../router.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

/**
 * @param {import('../routes/api.router.js').ApiRouter} router
 */
export function registerReservationRoutes(router) {
  const reservationRouter = new Router();
  const controller = new ReservationController();

  reservationRouter.get('/', authMiddleware, controller.list.bind(controller));
  reservationRouter.get('/:id', authMiddleware, controller.get.bind(controller));
  reservationRouter.post('/', authMiddleware, controller.create.bind(controller));
  reservationRouter.put('/:id', authMiddleware, controller.update.bind(controller));
  reservationRouter.patch('/:id', authMiddleware, controller.patch.bind(controller));
  reservationRouter.delete('/:id', authMiddleware, controller.delete.bind(controller));

  reservationRouter.post('/:id/confirm', authMiddleware, controller.confirm.bind(controller));
  reservationRouter.post('/:id/reject', authMiddleware, controller.reject.bind(controller));
  reservationRouter.post('/:id/cancel', authMiddleware, controller.cancel.bind(controller));
  reservationRouter.post('/:id/checkin', authMiddleware, controller.checkIn.bind(controller));
  reservationRouter.post('/:id/checkout', authMiddleware, controller.checkOut.bind(controller));

  router.use('/api/v1/reservations', reservationRouter.handle.bind(reservationRouter));
}

/**
 * Reservation Controller
 */
export class ReservationController {
  /** @type {Object|null} */
  #service = null;

  getService() {
    if (!this.#service) {
      const businessService = global.runtimeContext?.capabilities?.get('business');
      this.#service = businessService?.getReservationService?.() || businessService;
    }
    return this.#service;
  }

  async list(req, res) {
    const { page = 1, perPage = 20, status, businessId, visitorId } = req.query;

    const result = await this.getService()?.listReservations({
      page: parseInt(page),
      perPage: parseInt(perPage),
      status,
      businessId,
      visitorId,
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
    const reservation = await this.getService()?.getReservation(req.params.id, {
      tenantId: req.user?.tenantId,
    });

    if (!reservation) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Reservation not found' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: reservation }));
  }

  async create(req, res) {
    const reservation = await this.getService()?.createReservation(req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: reservation }));
  }

  async update(req, res) {
    const reservation = await this.getService()?.updateReservation(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: reservation }));
  }

  async patch(req, res) {
    const reservation = await this.getService()?.patchReservation(req.params.id, req.body, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: reservation }));
  }

  async delete(req, res) {
    await this.getService()?.deleteReservation(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 204;
    res.end();
  }

  async confirm(req, res) {
    const reservation = await this.getService()?.confirmReservation(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: reservation }));
  }

  async reject(req, res) {
    const reservation = await this.getService()?.rejectReservation(req.params.id, req.body?.reason, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: reservation }));
  }

  async cancel(req, res) {
    const reservation = await this.getService()?.cancelReservation(req.params.id, req.body?.reason, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: reservation }));
  }

  async checkIn(req, res) {
    const reservation = await this.getService()?.checkInReservation(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: reservation }));
  }

  async checkOut(req, res) {
    const reservation = await this.getService()?.checkOutReservation(req.params.id, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: reservation }));
  }
}
