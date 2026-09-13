/**
 * Reservation Routes
 *
 * Routes for Reservation endpoints.
 *
 * P14 - API Layer Foundation
 */

import { Router } from './router.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createRepositoriesFacade } from '../../runtime/startup/capability.bootstrap.js';
import { ReservationManager } from '../../capabilities/reservation/reservation.manager.js';
import { BusinessManager } from '../../capabilities/business/business.manager.js';

/**
 * Check if tenant is synthetic (bootstrap-only, not a real UUID)
 * @param {object} tenant
 * @returns {boolean}
 */
function isSyntheticTenant(tenant) {
  if (!tenant) return true
  const id = typeof tenant === 'string' ? tenant : tenant.id
  return !id || id === 'commercial'
}

/**
 * Create a tenant-scoped context for repository resolution.
 * The SAME context object is used for both repositories AND managers,
 * ensuring consistency throughout the call chain.
 * @param {object} baseContext - Global runtime context
 * @param {object} authenticatedTenant - Tenant from validated JWT identity
 * @returns {object} Scoped context with tenant-scoped repositories
 */
function createScopedContext(baseContext, authenticatedTenant) {
  const repositoryRuntime = baseContext.repositories || (baseContext.getModule ? baseContext.getModule('repository') : null)
  if (!repositoryRuntime || !authenticatedTenant) {
    throw new Error('Cannot create scoped context: repository runtime or tenant not available')
  }
  const scopedContext = Object.assign(Object.create(Object.getPrototypeOf(baseContext)), baseContext, {
    tenant: authenticatedTenant,
    repositories: null
  })
  scopedContext.repositories = createRepositoriesFacade(repositoryRuntime, scopedContext)
  return scopedContext
}

/**
 * Execute a reservation operation with tenant-scoped context.
 * Creates new manager instances with the SAME scoped context to ensure
 * all repository queries use the authenticated tenant.
 * @param {object} authenticatedTenant - Tenant from validated JWT identity
 * @param {object} identity - Authenticated user identity
 * @param {Function} operation - Async function(scopedReservationManager, scopedBusinessManager)
 * @returns {Promise<any>}
 */
async function withTenantScopedExecution(authenticatedTenant, identity, operation) {
  const baseContext = global.runtimeContext
  if (!baseContext) {
    throw new Error('Runtime context not available')
  }

  if (isSyntheticTenant(authenticatedTenant)) {
    throw new Error('Authenticated tenant is required for this operation')
  }
  const scopedContext = createScopedContext(baseContext, authenticatedTenant)
  const scopedReservationManager = new ReservationManager(scopedContext)
  const scopedBusinessManager = new BusinessManager(scopedContext, scopedReservationManager)

  return operation(scopedReservationManager, scopedBusinessManager)
}

export { withTenantScopedExecution }

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

  router.use('/api/v1/reservations', reservationRouter);
}

/**
 * Reservation Controller
 */
export class ReservationController {
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
    const { page = 1, perPage = 20, status, businessId, visitorId } = req.query;
    const authenticatedTenant = req.user?.tenant

    if (authenticatedTenant?.id) {
      try {
        const all = await withTenantScopedExecution(authenticatedTenant, null, async (scopedReservationManager) => {
          return await scopedReservationManager.findAll({ status, businessId, visitorId })
        })

        const start = (parseInt(page) - 1) * parseInt(perPage)
        const items = all.slice(start, start + parseInt(perPage))

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          success: true,
          data: items,
          pagination: { page: parseInt(page), perPage: parseInt(perPage), total: all.length },
        }))
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

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
    const authenticatedTenant = req.user?.tenant

    if (authenticatedTenant?.id) {
      try {
        const result = await withTenantScopedExecution(authenticatedTenant, null, async (scopedReservationManager) => {
          return await scopedReservationManager.findById(req.params.id)
        })

        if (!result) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Reservation not found' }))
          return
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, data: result }))
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    const reservation = await this.getService()?.getReservation(req.params.id, {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
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

    const authenticatedTenant = req.user?.tenant
    const identity = {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
      userId: req.user?.id,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
      tenant: req.user?.tenant,
    }

    if (authenticatedTenant?.id) {
      try {
        const result = await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager, scopedBusinessManager) => {
          const businessId = req.body?.businessId
          if (!businessId) {
            throw new Error('businessId is required')
          }
          const data = {
            ...req.body,
            tenantId: authenticatedTenant.id
          }
          return await scopedBusinessManager.createReservation(businessId, data, identity)
        })

        res.statusCode = 201
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, data: result }))
        return
      } catch (error) {
        res.statusCode = error.message.includes('not found') || error.message.includes('does not belong') || error.message.includes('required') ? 404 : 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Authenticated tenant required for this operation' }));
  }

  async update(req, res) {
    const authenticatedTenant = req.user?.tenant
    const identity = {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
      userId: req.user?.id,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
    }

    if (authenticatedTenant?.id) {
      try {
        const result = await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager) => {
          return await scopedReservationManager.updateReservation(req.params.id, req.body, identity)
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, data: result }))
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    const reservation = await this.getService()?.updateReservation(req.params.id, req.body, identity)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, data: reservation }))
  }

  async patch(req, res) {
    const authenticatedTenant = req.user?.tenant
    const identity = {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
      userId: req.user?.id,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
    }

    if (authenticatedTenant?.id) {
      try {
        const result = await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager) => {
          return await scopedReservationManager.updateReservation(req.params.id, req.body, identity)
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, data: result }))
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    const reservation = await this.getService()?.patchReservation(req.params.id, req.body, identity)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, data: reservation }))
  }

  async delete(req, res) {
    const authenticatedTenant = req.user?.tenant
    const identity = {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
      userId: req.user?.id,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
    }

    if (authenticatedTenant?.id) {
      try {
        await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager) => {
          return await scopedReservationManager.deleteReservation(req.params.id, identity)
        })
        res.statusCode = 204
        res.end()
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    await this.getService()?.deleteReservation(req.params.id, identity)

    res.statusCode = 204
    res.end()
  }

  async confirm(req, res) {
    const authenticatedTenant = req.user?.tenant
    const identity = {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
      userId: req.user?.id,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
    }

    if (authenticatedTenant?.id) {
      try {
        const result = await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager) => {
          return await scopedReservationManager.confirmReservation(req.params.id, identity)
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, data: result }))
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    const reservation = await this.getService()?.confirmReservation(req.params.id, identity)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, data: reservation }))
  }

  async reject(req, res) {
    const authenticatedTenant = req.user?.tenant
    const identity = {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
      userId: req.user?.id,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
    }

    if (authenticatedTenant?.id) {
      try {
        const result = await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager) => {
          return await scopedReservationManager.rejectReservation(req.params.id, req.body?.reason, identity)
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, data: result }))
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    const reservation = await this.getService()?.rejectReservation(req.params.id, req.body?.reason, identity)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, data: reservation }))
  }

  async cancel(req, res) {
    const authenticatedTenant = req.user?.tenant
    const identity = {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
      userId: req.user?.id,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
    }

    if (authenticatedTenant?.id) {
      try {
        const result = await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager) => {
          return await scopedReservationManager.cancelReservation(req.params.id, req.body?.reason, identity)
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, data: result }))
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    const reservation = await this.getService()?.cancelReservation(req.params.id, req.body?.reason, identity)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, data: reservation }))
  }

  async checkIn(req, res) {
    const authenticatedTenant = req.user?.tenant
    const identity = {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
      userId: req.user?.id,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
    }

    if (authenticatedTenant?.id) {
      try {
        const result = await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager) => {
          return await scopedReservationManager.checkInReservation(req.params.id, identity)
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, data: result }))
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    const reservation = await this.getService()?.checkInReservation(req.params.id, identity)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, data: reservation }))
  }

  async checkOut(req, res) {
    const authenticatedTenant = req.user?.tenant
    const identity = {
      tenantId: req.user?.tenant?.id || req.user?.tenantId,
      userId: req.user?.id,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
    }

    if (authenticatedTenant?.id) {
      try {
        const result = await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager) => {
          return await scopedReservationManager.checkOutReservation(req.params.id, identity)
        })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, data: result }))
        return
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
        return
      }
    }

    const reservation = await this.getService()?.checkOutReservation(req.params.id, identity)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, data: reservation }))
  }
}

