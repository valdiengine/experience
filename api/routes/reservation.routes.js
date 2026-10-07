/**
 * Reservation Routes
 *
 * Routes for Reservation endpoints.
 *
 * P14 - API Layer Foundation
 */

import { Router } from './router.js';
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorization.middleware.js';
import { createRepositoriesFacade } from '../../runtime/startup/capability.bootstrap.js';
import { ReservationManager, isPersistedTenantScope } from '../../capabilities/reservation/reservation.manager.js';
import { RESERVATION_PERMISSIONS } from '../../capabilities/reservation/reservation.permissions.js';
import { BusinessManager } from '../../capabilities/business/business.manager.js';

/**
 * CANCEL-TIMEOUT-REMEDIATION-1: finish a response exactly once.
 *
 * If a handler already committed status/headers/body, that response is
 * preserved untouched and only the connection is closed. Otherwise a sanitized
 * JSON 500 is written. `error.message` is never serialized.
 *
 * @param {object} res
 */
function terminateCancelWithError(res) {
  if (res.headersSent || res.writableEnded) {
    if (!res.writableEnded) {
      res.end()
    }
    return
  }

  res.statusCode = 500
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      error: {
        code: 'CANCEL_FAILED',
        message: 'The reservation could not be cancelled.'
      }
    })
  )
}

/**
 * CANCEL-TIMEOUT-REMEDIATION-2: refuse a cancel whose identity carries no tenant.
 *
 * Bounded and sanitized exactly like `terminateCancelWithError`: a fixed body, no
 * `error.message`, no tenant id, no reservation id, no credential. Reached before
 * the business service, manager, repository, pool or transaction, so a missing
 * tenant can no longer produce a database round trip.
 *
 * @param {object} res
 */
function terminateCancelWithoutTenant(res) {
  if (res.headersSent || res.writableEnded) {
    if (!res.writableEnded) {
      res.end()
    }
    return
  }

  res.statusCode = 401
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      error: {
        code: 'CANCEL_TENANT_REQUIRED',
        message: 'The reservation could not be cancelled.'
      }
    })
  )
}

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
  // CANCEL-TIMEOUT-REMEDIATION-2: this is the only commercial route hardened in
  // this slice. `requireAuth` runs AFTER `authMiddleware`, so a missing or refused
  // credential is answered with a bounded 401 and the handler never runs. The
  // other reservation routes keep `authMiddleware`-only semantics on purpose.
  reservationRouter.post(
    '/:id/cancel',
    authMiddleware,
    requireAuth,
    // CANCEL-TIMEOUT-REMEDIATION-2C: the authorization gate for this route.
    //
    // `ReservationManager.cancelReservation()` already calls `#checkPermission()`
    // with `reservation:cancel`, so an identity without that permission is
    // already stopped before any mutation — the existing layer prevents it. That
    // rejection is raised as a plain Error and the handler maps every thrown
    // error to 500, so a routine authorization denial was being reported as an
    // internal fault.
    //
    // This uses the existing `requirePermission` middleware rather than changing
    // `#checkPermission()`, because that method is shared with internal and
    // timer-driven cancellation which legitimately has no user identity. The
    // middleware is already fail-closed: `checkPermission()` returns false when
    // no auth runtime is reachable, and it answers 401 without an identity and
    // 403 without the grant. Net effect for /cancel: the same denial, decided
    // before any business logic, reported with authorization semantics.
    requirePermission(RESERVATION_PERMISSIONS.CANCEL),
    controller.cancel.bind(controller)
  );
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

    // CANCEL-TIMEOUT-REMEDIATION-2: fail closed BEFORE any business capability is
    // touched.
    //
    // `requireAuth` already guarantees `req.user` is a verified identity, but an
    // identity is not necessarily a TENANT identity: a token minted without a
    // `tid` claim yields `req.user.tenant === null` while still authenticating.
    // That case used to fall through to the unscoped branch below, which called
    // `cancelReservation` with `businessId = null`, reached
    // `#assertBusinessActive(null)` and failed in a repository lookup — an
    // authenticated-looking request that never had a tenancy.
    //
    // 401 rather than 403: the request cannot be attributed to any tenant, so no
    // authorization decision is even reachable. 403 would assert that we know who
    // the caller is and merely lack a grant; we do not know that. This matches
    // the existing `requireAuth` contract, which also answers 401 for credentials
    // that do not establish a usable principal.
    if (!authenticatedTenant?.id) {
      terminateCancelWithoutTenant(res)
      return
    }

    // CANCEL-TIMEOUT-REMEDIATION-2C: a present id is not necessarily a real
    // tenant scope. `tid=commercial` — the synthetic bootstrap tenant — is a
    // truthy string, so it passed the presence check above and then failed
    // deeper in `withTenantScopedExecution`, whose contract refuses a
    // synthetic tenant. That rejection surfaced as a bounded 500, which is an
    // internal-error status for what is really an unattributable caller, and
    // it re-injected noise into the exact 500 class under investigation.
    //
    // `isPersistedTenantScope` is the existing exported contract for this
    // decision, already used by `ReservationCapability.activate()` to decide
    // whether a tenant may drive a persisted read. It is deliberately a
    // NEGATIVE check, not a shape check: it refuses only the synthetic
    // commercial tenant, a non-string id, and a blank id. A well-formed tenant
    // that does not exist stays resolvable by the existing tenant-scoped
    // architecture, and a new real tenant form is not silently refused.
    //
    // The check is a pure string test: no database, tenant table or repository
    // read, so it cannot become its own availability dependency.
    //
    // 401 for the same reason as the absent-tenant case above: the request
    // cannot be attributed to any real tenant, so no authorization decision is
    // reachable. Same bounded helper, same `CANCEL_TENANT_REQUIRED` contract.
    if (!isPersistedTenantScope(authenticatedTenant.id)) {
      terminateCancelWithoutTenant(res)
      return
    }

    try {
      const result = await withTenantScopedExecution(authenticatedTenant, identity, async (scopedReservationManager) => {
        return await scopedReservationManager.cancelReservation(req.params.id, req.body?.reason, identity)
      })
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true, data: result }))
    } catch (error) {
      // The rejection is classified from a closed enum and `error.message` is
      // never serialized: a repository or driver message can carry a statement,
      // an identifier or a tenant id.
      terminateCancelWithError(res)
    }
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

