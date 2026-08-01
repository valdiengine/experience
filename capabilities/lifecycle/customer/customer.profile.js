/**
 * Customer Profile — Detailed customer information
 *
 * Business-agnostic: profile data and metadata
 */

export class CustomerProfile {
  #profiles = new Map()

  /**
   * Create or update profile
   * @param {string} tenantId
   * @param {object} data - { name, email, phone, businessType, industry, location }
   * @returns {object}
   */
  upsert(tenantId, data) {
    if (!tenantId) return { success: false, error: 'Tenant ID is required' }

    const existing = this.#profiles.get(tenantId) || {}
    const profile = {
      ...existing,
      tenantId,
      name: data.name || existing.name || '',
      email: data.email || existing.email || '',
      phone: data.phone || existing.phone || '',
      businessType: data.businessType || existing.businessType || 'service',
      industry: data.industry || existing.industry || '',
      location: data.location || existing.location || '',
      website: data.website || existing.website || '',
      logo: data.logo || existing.logo || '',
      description: data.description || existing.description || '',
      socialLinks: data.socialLinks || existing.socialLinks || {},
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString(),
    }

    this.#profiles.set(tenantId, profile)
    return { success: true, profile }
  }

  /**
   * Get profile
   * @param {string} tenantId
   * @returns {object|null}
   */
  get(tenantId) {
    return this.#profiles.get(tenantId) || null
  }

  /**
   * Update profile fields
   * @param {string} tenantId
   * @param {object} updates
   * @returns {object}
   */
  update(tenantId, updates) {
    const profile = this.#profiles.get(tenantId)
    if (!profile) return { success: false, error: `Profile ${tenantId} not found` }

    const updated = { ...profile, ...updates, updatedAt: new Date().toISOString() }
    this.#profiles.set(tenantId, updated)
    return { success: true, profile: updated }
  }

  /**
   * Delete profile
   * @param {string} tenantId
   * @returns {object}
   */
  delete(tenantId) {
    if (!this.#profiles.has(tenantId)) return { success: false, error: `Profile ${tenantId} not found` }
    this.#profiles.delete(tenantId)
    return { success: true }
  }

  /**
   * Check if profile is complete
   * @param {string} tenantId
   * @returns {object} - { complete: boolean, missing: string[] }
   */
  completeness(tenantId) {
    const profile = this.#profiles.get(tenantId)
    if (!profile) return { complete: false, missing: ['name', 'email', 'businessType'] }

    const required = ['name', 'email', 'businessType']
    const missing = required.filter(f => !profile[f])
    return { complete: missing.length === 0, missing }
  }

  /**
   * Get all profiles
   * @param {object} filter - { businessType }
   * @returns {object[]}
   */
  getAll(filter = {}) {
    let profiles = Array.from(this.#profiles.values())
    if (filter.businessType) profiles = profiles.filter(p => p.businessType === filter.businessType)
    return profiles
  }
}
