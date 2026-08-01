export class BusinessBrandManager {
  #context

  constructor(context) {
    this.#context = context
  }

  // ── Branding ──

  async getBranding(businessId) {
    const business = await this.#context?.repositories?.business?.findById(businessId)
    if (!business) return null
    return {
      logo: business.defaultLogo || null,
      cover: business.defaultCover || null,
      brandColors: business.defaultBrandColors || null,
      currency: business.defaultCurrency || null,
      language: business.defaultLanguage || null,
      timezone: business.defaultTimezone || null,
      policies: business.defaultPolicies || null,
    }
  }

  async updateBranding(businessId, data, identity) {
    const updates = {}
    if (data.logo !== undefined) updates.defaultLogo = data.logo
    if (data.cover !== undefined) updates.defaultCover = data.cover
    if (data.brandColors !== undefined) updates.defaultBrandColors = data.brandColors
    if (data.currency !== undefined) updates.defaultCurrency = data.currency
    if (data.language !== undefined) updates.defaultLanguage = data.language
    if (data.timezone !== undefined) updates.defaultTimezone = data.timezone
    if (data.policies !== undefined) updates.defaultPolicies = data.policies
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString()
      await this.#context?.repositories?.business?.update({ id: businessId }, updates)
    }
    return { success: true }
  }

  // ── Future: White Label / Custom Domain / Brand Kit ──

  // async getWhiteLabelConfig(businessId) { /* TODO: P13.x */ }
  // async updateWhiteLabelConfig(businessId, data) { /* TODO: P13.x */ }
}
