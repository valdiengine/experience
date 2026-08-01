/**
 * Tenant Settings — Tenant configuration management
 *
 * Business-agnostic: allows updating tenant settings, branding, capabilities
 */
import { SAAS_PLANS, PLAN_LIMITS } from '../admin.schema.js'
import { ADMIN_EVENTS } from '../admin.events.js'

export class TenantSettings {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Update tenant branding
   * @param {string} tenantId
   * @param {object} branding - { logo, favicon, colors, fonts }
   * @returns {object}
   */
  async updateBranding(tenantId, branding) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return { success: false, error: 'Tenant not found' }

    tenant.branding = { ...tenant.branding, ...branding }
    if (branding.colors) {
      tenant.theme = { ...tenant.theme, ...branding.colors }
    }

    this.#context?.eventBus?.emit(ADMIN_EVENTS.TENANT_UPDATED, {
      tenantId,
      field: 'branding',
    })

    return { success: true, branding: tenant.branding }
  }

  /**
   * Update tenant PWA configuration
   * @param {string} tenantId
   * @param {object} pwaConfig - { enabled, name, shortName, icons, themeColor, backgroundColor, offline, push }
   * @returns {object}
   */
  async updatePWAConfig(tenantId, pwaConfig) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return { success: false, error: 'Tenant not found' }

    tenant.pwa = { ...tenant.pwa, ...pwaConfig }

    this.#context?.eventBus?.emit(ADMIN_EVENTS.TENANT_UPDATED, {
      tenantId,
      field: 'pwa',
    })

    return { success: true, pwa: tenant.pwa }
  }

  /**
   * Enable a capability for tenant
   * @param {string} tenantId
   * @param {string} capabilityId
   * @returns {object}
   */
  async enableCapability(tenantId, capabilityId) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return { success: false, error: 'Tenant not found' }

    if (!tenant.capabilities) tenant.capabilities = []
    if (!tenant.capabilities.includes(capabilityId)) {
      tenant.capabilities.push(capabilityId)
    }

    this.#context?.eventBus?.emit(ADMIN_EVENTS.CAPABILITY_ENABLED, {
      tenantId,
      capabilityId,
    })

    return { success: true, capabilities: tenant.capabilities }
  }

  /**
   * Disable a capability for tenant
   * @param {string} tenantId
   * @param {string} capabilityId
   * @returns {object}
   */
  async disableCapability(tenantId, capabilityId) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return { success: false, error: 'Tenant not found' }

    if (tenant.capabilities) {
      tenant.capabilities = tenant.capabilities.filter(c => c !== capabilityId)
    }

    this.#context?.eventBus?.emit(ADMIN_EVENTS.CAPABILITY_DISABLED, {
      tenantId,
      capabilityId,
    })

    return { success: true, capabilities: tenant.capabilities }
  }

  /**
   * Change tenant plan
   * @param {string} tenantId
   * @param {string} newPlan
   * @returns {object}
   */
  async changePlan(tenantId, newPlan) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return { success: false, error: 'Tenant not found' }

    if (!Object.values(SAAS_PLANS).includes(newPlan)) {
      return { success: false, error: 'Invalid plan' }
    }

    const oldPlan = tenant.plan
    tenant.plan = newPlan

    const newCapabilities = PLAN_LIMITS[newPlan]?.capabilities || []
    tenant.capabilities = [...new Set([...(tenant.capabilities || []), ...newCapabilities])]

    this.#context?.eventBus?.emit(ADMIN_EVENTS.PLAN_CHANGED, {
      tenantId,
      oldPlan,
      newPlan,
    })

    return {
      success: true,
      plan: newPlan,
      capabilities: tenant.capabilities,
      limits: PLAN_LIMITS[newPlan],
    }
  }

  /**
   * Update domain configuration
   * @param {string} tenantId
   * @param {object} domainConfig - { customDomain, sslEnabled, redirectUrls }
   * @returns {object}
   */
  async updateDomainConfig(tenantId, domainConfig) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return { success: false, error: 'Tenant not found' }

    tenant.customDomain = domainConfig.customDomain || tenant.customDomain
    tenant.sslEnabled = domainConfig.sslEnabled ?? tenant.sslEnabled
    tenant.redirectUrls = domainConfig.redirectUrls || tenant.redirectUrls

    this.#context?.eventBus?.emit(ADMIN_EVENTS.TENANT_UPDATED, {
      tenantId,
      field: 'domain',
    })

    return { success: true }
  }

  /**
   * Update tenant business profile
   * @param {string} tenantId
   * @param {object} profile - { name, description, phone, email, address }
   * @returns {object}
   */
  async updateProfile(tenantId, profile) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return { success: false, error: 'Tenant not found' }

    Object.assign(tenant, profile)

    this.#context?.eventBus?.emit(ADMIN_EVENTS.TENANT_UPDATED, {
      tenantId,
      field: 'profile',
    })

    return { success: true }
  }

  // ── Private ──

  async #getTenant(tenantId) {
    const onboarding = this.#context?.capabilities?.get?.('onboarding')
    if (onboarding?.getTenant) return onboarding.getTenant(tenantId)
    return this.#context?.tenant || null
  }
}
