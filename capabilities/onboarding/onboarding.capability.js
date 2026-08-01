/**
 * Onboarding Capability — Business registration and tenant creation
 *
 * Business-agnostic: creates tenants, not business logic
 * Uses context.capabilities for cross-communication
 * No direct imports from other capabilities
 */
import { BaseCapability } from '../core/base.capability.js'
import { OnboardingManager } from './onboarding.manager.js'
import { ONBOARDING_EVENTS } from './onboarding.events.js'
import { getAllBusinessTypes, isValidBusinessType } from './business.types.js'
import { getAllPlans, isValidPlan } from './plans.js'

export class OnboardingCapability extends BaseCapability {
  static id = 'onboarding'
  static name = 'Onboarding'
  static version = '1.0.0'
  static dependencies = []

  #manager = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new OnboardingManager(context)
  }

  async activate() {
    this.on(ONBOARDING_EVENTS.BUSINESS_REGISTERED, (data) => {
      console.log(`[Onboarding] Business registered: ${data.business?.name} (${data.business?.tenantId})`)
    })
    this.on(ONBOARDING_EVENTS.TENANT_CREATED, (data) => {
      console.log(`[Onboarding] Tenant created: ${data.tenant?.id}`)
    })
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
    this.#manager = null
  }

  async destroy() {
    this.#manager = null
    await super.destroy()
  }

  // ── Getters ──

  get manager() { return this.#manager }

  // ── Public Methods ──

  /**
   * Register a new business
   * @param {object} data - { name, type, plan?, ownerEmail, ownerName, location?, category?, phone?, whatsapp? }
   * @returns {Promise<object>}
   */
  async registerBusiness(data) {
    return this.#manager?.registerBusiness(data) || { success: false, errors: ['Manager not initialized'] }
  }

  /**
   * Update business plan
   * @param {string} tenantId
   * @param {string} newPlan
   * @returns {object}
   */
  updatePlan(tenantId, newPlan) {
    return this.#manager?.updatePlan(tenantId, newPlan) || { success: false, error: 'Manager not initialized' }
  }

  /**
   * Get business profile
   * @param {string} tenantId
   * @returns {object|null}
   */
  getBusiness(tenantId) {
    return this.#manager?.getBusiness(tenantId) || null
  }

  /**
   * Get tenant configuration
   * @param {string} tenantId
   * @returns {object|null}
   */
  getTenantConfig(tenantId) {
    return this.#manager?.getTenantConfig(tenantId) || null
  }

  /**
   * Get all registered businesses
   * @returns {object[]}
   */
  getAllBusinesses() {
    return this.#manager?.getAllBusinesses() || []
  }

  /**
   * Get available business types
   * @returns {object[]}
   */
  getBusinessTypes() {
    return getAllBusinessTypes()
  }

  /**
   * Get available plans
   * @returns {object[]}
   */
  getPlans() {
    return getAllPlans()
  }

  /**
   * Get capabilities for a business type + plan combination
   * @param {string} typeId
   * @param {string} planId
   * @returns {string[]}
   */
  getEffectiveCapabilities(typeId, planId) {
    return this.#manager?.registry?.getEffectiveCapabilities(typeId, planId) || []
  }
}

export default OnboardingCapability
