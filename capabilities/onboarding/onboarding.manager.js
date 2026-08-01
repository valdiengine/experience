/**
 * Onboarding Manager — Business registration and tenant creation
 *
 * Business-agnostic: creates tenants, not business logic
 * Uses DataManager for persistence
 * Uses EventBus for events
 */
import { BusinessRegistry } from './business.registry.js'
import { validateBusinessProfile, validateTenantConfig } from './onboarding.schema.js'
import { ONBOARDING_EVENTS, BUSINESS_STATUS } from './onboarding.events.js'
import { isValidBusinessType } from './business.types.js'
import { isValidPlan } from './plans.js'

export class OnboardingManager {
  #context = null
  #registry = null

  constructor(context) {
    this.#context = context
    this.#registry = new BusinessRegistry(context)
  }

  // ── Getters ──

  get registry() { return this.#registry }

  /**
   * Register a new business
   * @param {object} data - { name, type, plan?, ownerEmail, ownerName, location?, category? }
   * @returns {Promise<object>} - { success, businessId?, tenantId?, errors? }
   */
  async registerBusiness(data) {
    const errors = this.#validateRegistrationData(data)
    if (errors.length > 0) {
      return { success: false, errors }
    }

    const tenantId = this.#generateTenantId(data.name)
    const businessId = `biz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const typeDef = this.#registry.getType(data.type)
    const planId = data.plan || this.#registry.getDefaultPlan(data.type)
    const capabilities = this.#registry.getEffectiveCapabilities(data.type, planId)

    const profile = {
      id: businessId,
      tenantId,
      ownerId: `owner_${Date.now()}`,
      name: data.name,
      type: data.type,
      category: data.category || null,
      contact: {
        email: data.ownerEmail || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
      },
      location: data.location || null,
      plan: planId,
      capabilities,
      createdAt: new Date().toISOString(),
      status: BUSINESS_STATUS.ACTIVE,
    }

    const profileValidation = validateBusinessProfile(profile)
    if (!profileValidation.valid) {
      return { success: false, errors: profileValidation.errors }
    }

    const tenantConfig = {
      id: tenantId,
      name: data.name,
      type: data.type,
      plan: planId,
      capabilities,
      config: {
        businessId,
        ownerEmail: data.ownerEmail,
        ownerName: data.ownerName,
      },
      createdAt: new Date().toISOString(),
      status: 'active',
    }

    const tenantValidation = validateTenantConfig(tenantConfig)
    if (!tenantValidation.valid) {
      return { success: false, errors: tenantValidation.errors }
    }

    this.#persistBusiness(profile)
    this.#persistTenant(tenantConfig)

    this.#emit(ONBOARDING_EVENTS.BUSINESS_REGISTERED, { business: profile })
    this.#emit(ONBOARDING_EVENTS.TENANT_CREATED, { tenant: tenantConfig })
    this.#emit(ONBOARDING_EVENTS.PLAN_ASSIGNED, {
      tenantId,
      plan: planId,
      capabilities,
    })
    this.#emit(ONBOARDING_EVENTS.CAPABILITIES_ASSIGNED, {
      tenantId,
      capabilities,
    })

    return {
      success: true,
      businessId,
      tenantId,
      plan: planId,
      capabilities,
    }
  }

  /**
   * Update business plan
   * @param {string} tenantId
   * @param {string} newPlan
   * @returns {object}
   */
  updatePlan(tenantId, newPlan) {
    if (!isValidPlan(newPlan)) {
      return { success: false, error: 'Invalid plan' }
    }

    const profile = this.#getBusinessByTenantId(tenantId)
    if (!profile) {
      return { success: false, error: 'Business not found' }
    }

    const capabilities = this.#registry.getEffectiveCapabilities(profile.type, newPlan)

    const updatedProfile = {
      ...profile,
      plan: newPlan,
      capabilities,
    }

    this.#persistBusiness(updatedProfile)

    const tenantConfig = this.#getTenant(tenantId)
    if (tenantConfig) {
      const updatedTenant = {
        ...tenantConfig,
        plan: newPlan,
        capabilities,
      }
      this.#persistTenant(updatedTenant)
    }

    this.#emit(ONBOARDING_EVENTS.PLAN_CHANGED, {
      tenantId,
      oldPlan: profile.plan,
      newPlan,
      capabilities,
    })

    return { success: true, plan: newPlan, capabilities }
  }

  /**
   * Get business profile by tenant ID
   * @param {string} tenantId
   * @returns {object|null}
   */
  getBusiness(tenantId) {
    return this.#getBusinessByTenantId(tenantId)
  }

  /**
   * Get tenant configuration
   * @param {string} tenantId
   * @returns {object|null}
   */
  getTenantConfig(tenantId) {
    return this.#getTenant(tenantId)
  }

  /**
   * Get all registered businesses
   * @returns {object[]}
   */
  getAllBusinesses() {
    return this.#context?.dataManager?.get('onboardingBusinesses') || []
  }

  /**
   * Get businesses by type
   * @param {string} type
   * @returns {object[]}
   */
  getBusinessesByType(type) {
    return this.getAllBusinesses().filter(b => b.type === type)
  }

  /**
   * Get businesses by plan
   * @param {string} plan
   * @returns {object[]}
   */
  getBusinessesByPlan(plan) {
    return this.getAllBusinesses().filter(b => b.plan === plan)
  }

  // ── Private Methods ──

  #validateRegistrationData(data) {
    const errors = []

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Name is required')
    }

    if (!data.type || !isValidBusinessType(data.type)) {
      errors.push('Valid business type is required')
    }

    if (data.plan && !isValidPlan(data.plan)) {
      errors.push('Invalid plan')
    }

    return errors
  }

  #generateTenantId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  #getBusinessByTenantId(tenantId) {
    const businesses = this.getAllBusinesses()
    return businesses.find(b => b.tenantId === tenantId) || null
  }

  #getTenant(tenantId) {
    const tenants = this.#context?.dataManager?.get('tenants') || []
    return tenants.find(t => t.id === tenantId) || null
  }

  #persistBusiness(profile) {
    if (this.#context?.dataManager) {
      const businesses = this.getAllBusinesses()
      const index = businesses.findIndex(b => b.id === profile.id)
      if (index >= 0) {
        businesses[index] = profile
      } else {
        businesses.push(profile)
      }
      this.#context.dataManager.set('onboardingBusinesses', businesses)
    }
  }

  #persistTenant(tenantConfig) {
    if (this.#context?.dataManager) {
      const tenants = this.#context.dataManager.get('tenants') || []
      const index = tenants.findIndex(t => t.id === tenantConfig.id)
      if (index >= 0) {
        tenants[index] = tenantConfig
      } else {
        tenants.push(tenantConfig)
      }
      this.#context.dataManager.set('tenants', tenants)
    }
  }

  #emit(event, data) {
    this.#context?.eventBus?.emit(event, data)
  }
}
