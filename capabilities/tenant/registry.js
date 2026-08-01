/**
 * TenantRegistry — Registry of available tenants
 *
 * Manages tenant registrations and lookups.
 * Does NOT know about specific tenant business logic.
 */
export class TenantRegistry {
  #tenants = new Map()
  #defaultTenantId = null

  /**
   * Register a tenant configuration
   * @param {object} config - Tenant configuration (must have id, name, slug)
   * @returns {object} - Registered tenant config
   */
  register(config) {
    if (!config?.id) throw new Error('Tenant config must have an id')
    if (!config?.slug) throw new Error('Tenant config must have a slug')

    this.#tenants.set(config.id, config)

    if (!this.#defaultTenantId) {
      this.#defaultTenantId = config.id
    }

    return config
  }

  /**
   * Unregister a tenant
   * @param {string} tenantId - Tenant ID to remove
   * @returns {boolean} - true if removed
   */
  unregister(tenantId) {
    if (tenantId === this.#defaultTenantId) {
      this.#defaultTenantId = null
    }
    return this.#tenants.delete(tenantId)
  }

  /**
   * Get tenant by ID
   * @param {string} tenantId - Tenant ID
   * @returns {object|null}
   */
  get(tenantId) {
    return this.#tenants.get(tenantId) || null
  }

  /**
   * Get tenant by slug
   * @param {string} slug - Tenant slug
   * @returns {object|null}
   */
  getBySlug(slug) {
    for (const tenant of this.#tenants.values()) {
      if (tenant.slug === slug) return tenant
    }
    return null
  }

  /**
   * Get tenant by domain
   * @param {string} domain - Tenant domain
   * @returns {object|null}
   */
  getByDomain(domain) {
    for (const tenant of this.#tenants.values()) {
      if (tenant.domain === domain) return tenant
    }
    return null
  }

  /**
   * Get default tenant
   * @returns {object|null}
   */
  getDefault() {
    return this.#tenants.get(this.#defaultTenantId) || null
  }

  /**
   * Set default tenant
   * @param {string} tenantId - Tenant ID to set as default
   */
  setDefault(tenantId) {
    if (!this.#tenants.has(tenantId)) {
      throw new Error(`Tenant not found: ${tenantId}`)
    }
    this.#defaultTenantId = tenantId
  }

  /**
   * Get all registered tenants
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#tenants.values())
  }

  /**
   * Check if tenant exists
   * @param {string} tenantId - Tenant ID
   * @returns {boolean}
   */
  has(tenantId) {
    return this.#tenants.has(tenantId)
  }

  /**
   * Get tenant count
   * @returns {number}
   */
  get size() {
    return this.#tenants.size
  }

  /**
   * Clear all tenants
   */
  clear() {
    this.#tenants.clear()
    this.#defaultTenantId = null
  }
}
