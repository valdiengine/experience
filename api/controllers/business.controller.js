/**
 * Business Controller
 *
 * Handles HTTP requests for Business aggregate.
 * Delegates to BusinessService for all business logic.
 *
 * P14 - API Layer Foundation
 *
 * Rules:
 * - NEVER access repository directly
 * - NEVER duplicate business logic
 * - NEVER duplicate validation
 * - Use BusinessService for all operations
 */

import { BaseController } from './base.controller.js';
import { NotFoundError, BadRequestError } from '../errors/api.errors.js';

/**
 * Controller for Business endpoints
 */
export class BusinessController extends BaseController {
  /** @type {Object|null} */
  #businessService = null;

  constructor() {
    super();
  }

  /**
   * Get BusinessService instance
   * @returns {Object}
   */
  getService() {
    if (!this.#businessService) {
      if (!global.runtimeContext?.capabilities) {
        throw new Error('Runtime context not initialized');
      }
      this.#businessService = global.runtimeContext.capabilities.get('business');
    }
    return this.#businessService;
  }

  /**
   * List businesses
   * GET /api/v1/business
   *
   * @param {Object} req
   * @param {Object} res
   */
  async list(req, res) {
    try {
      const { page, perPage } = this.getPagination(req);
      const result = await this.getService().listBusinesses({
        page,
        perPage,
        tenantId: req.user?.tenantId,
      });

      this.paginated(res, result.items, {
        page,
        perPage,
        total: result.total,
      }, { requestId: req.id });
    } catch (error) {
      throw this.translateError(error);
    }
  }

  /**
   * Get business by ID
   * GET /api/v1/business/:id
   *
   * @param {Object} req
   * @param {Object} res
   */
  async get(req, res) {
    try {
      const { id } = req.params;
      const business = await this.getService().getBusiness(id, {
        tenantId: req.user?.tenantId,
      });

      if (!business) {
        throw new NotFoundError('Business', id);
      }

      this.success(res, business, { requestId: req.id });
    } catch (error) {
      throw this.translateError(error);
    }
  }

  /**
   * Create business
   * POST /api/v1/business
   *
   * @param {Object} req
   * @param {Object} res
   */
  async create(req, res) {
    try {
      const business = await this.getService().createBusiness(req.body, {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
      });

      this.created(res, business, `/api/v1/business/${business.id}`, {
        requestId: req.id,
      });
    } catch (error) {
      throw this.translateError(error);
    }
  }

  /**
   * Update business (full)
   * PUT /api/v1/business/:id
   *
   * @param {Object} req
   * @param {Object} res
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const business = await this.getService().updateBusiness(id, req.body, {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
      });

      this.success(res, business, { requestId: req.id });
    } catch (error) {
      throw this.translateError(error);
    }
  }

  /**
   * Update business (partial)
   * PATCH /api/v1/business/:id
   *
   * @param {Object} req
   * @param {Object} res
   */
  async patch(req, res) {
    try {
      const { id } = req.params;
      const business = await this.getService().patchBusiness(id, req.body, {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
      });

      this.success(res, business, { requestId: req.id });
    } catch (error) {
      throw this.translateError(error);
    }
  }

  /**
   * Delete business
   * DELETE /api/v1/business/:id
   *
   * @param {Object} req
   * @param {Object} res
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      await this.getService().deleteBusiness(id, {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
      });

      this.noContent(res);
    } catch (error) {
      throw this.translateError(error);
    }
  }

  /**
   * Archive business
   * POST /api/v1/business/:id/archive
   *
   * @param {Object} req
   * @param {Object} res
   */
  async archive(req, res) {
    try {
      const { id } = req.params;
      const business = await this.getService().archiveBusiness(id, {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
      });

      this.success(res, business, { requestId: req.id });
    } catch (error) {
      throw this.translateError(error);
    }
  }

  /**
   * Restore business
   * POST /api/v1/business/:id/restore
   *
   * @param {Object} req
   * @param {Object} res
   */
  async restore(req, res) {
    try {
      const { id } = req.params;
      const business = await this.getService().restoreBusiness(id, {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
      });

      this.success(res, business, { requestId: req.id });
    } catch (error) {
      throw this.translateError(error);
    }
  }
}
