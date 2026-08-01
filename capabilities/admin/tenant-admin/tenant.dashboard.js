/**
 * Tenant Dashboard — Tenant administration overview
 *
 * Business-agnostic: displays tenant info, plan, capabilities, usage
 */
import { SAAS_PLANS, PLAN_LIMITS } from '../admin.schema.js'

export class TenantDashboard {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Get tenant overview data
   * @param {string} tenantId
   * @returns {object}
   */
  async getOverview(tenantId) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return null

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status || 'active',
      plan: tenant.plan || SAAS_PLANS.FREE,
      createdAt: tenant.createdAt,
      capabilities: tenant.capabilities || [],
      usage: await this.#getUsage(tenantId),
      limits: PLAN_LIMITS[tenant.plan] || PLAN_LIMITS[SAAS_PLANS.FREE],
    }
  }

  /**
   * Get tenant business profile
   * @param {string} tenantId
   * @returns {object}
   */
  async getBusinessProfile(tenantId) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return null

    return {
      name: tenant.name,
      type: tenant.type,
      description: tenant.description,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      coordinates: tenant.coordinates,
      socialMedia: tenant.socialMedia,
      businessHours: tenant.businessHours,
    }
  }

  /**
   * Get tenant branding configuration
   * @param {string} tenantId
   * @returns {object}
   */
  async getBranding(tenantId) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return null

    return {
      logo: tenant.branding?.logo,
      favicon: tenant.branding?.favicon,
      colors: tenant.theme || {},
      fonts: tenant.fonts || {},
      images: tenant.branding?.images || [],
    }
  }

  /**
   * Get tenant domain configuration
   * @param {string} tenantId
   * @returns {object}
   */
  async getDomainConfig(tenantId) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return null

    return {
      subdomain: tenant.slug,
      customDomain: tenant.customDomain,
      sslEnabled: tenant.sslEnabled || false,
      redirectUrls: tenant.redirectUrls || [],
    }
  }

  /**
   * Get tenant PWA configuration
   * @param {string} tenantId
   * @returns {object}
   */
  async getPWAConfig(tenantId) {
    const tenant = await this.#getTenant(tenantId)
    if (!tenant) return null

    return {
      enabled: tenant.pwa?.enabled || false,
      name: tenant.pwa?.name || tenant.name,
      shortName: tenant.pwa?.shortName,
      icons: tenant.pwa?.icons || [],
      themeColor: tenant.pwa?.themeColor || tenant.theme?.primary,
      backgroundColor: tenant.pwa?.backgroundColor || tenant.theme?.background,
      offline: tenant.pwa?.offline !== false,
      push: tenant.pwa?.push || false,
    }
  }

  /**
   * Get enabled capabilities for tenant
   * @param {string} tenantId
   * @returns {string[]}
   */
  async getCapabilities(tenantId) {
    const tenant = await this.#getTenant(tenantId)
    return tenant?.capabilities || []
  }

  /**
   * Check if capability is enabled
   * @param {string} tenantId
   * @param {string} capabilityId
   * @returns {boolean}
   */
  async hasCapability(tenantId, capabilityId) {
    const capabilities = await this.getCapabilities(tenantId)
    return capabilities.includes(capabilityId)
  }

  // ── Private ──

  async #getTenant(tenantId) {
    const onboarding = this.#context?.capabilities?.get?.('onboarding')
    if (onboarding?.getTenant) return onboarding.getTenant(tenantId)
    return this.#context?.tenant || null
  }

  async #getUsage(tenantId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    const cms = this.#context?.capabilities?.get?.('cms')

    let reservationCount = 0
    let pageCount = 0

    if (reservation?.getCount) {
      reservationCount = await reservation.getCount(tenantId)
    }

    if (cms?.getAll) {
      pageCount = cms.getAll().length
    }

    return {
      reservations: reservationCount,
      pages: pageCount,
      users: 0,
    }
  }
}
