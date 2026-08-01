/**
 * TenantResolver — Resolves current tenant from identifier
 *
 * Determines which tenant to load based on:
 * 1. URL parameter (?tenant=slug)
 * 2. Subdomain (tenant.domain.com)
 * 3. Path segment (/tenant/slug/...)
 * 4. localStorage (remembered tenant)
 * 5. Default tenant
 *
 * Does NOT know about specific tenants or business logic.
 */
export class TenantResolver {
  #registry

  /**
   * @param {TenantRegistry} registry - Tenant registry instance
   */
  constructor(registry) {
    this.#registry = registry
  }

  /**
   * Resolve current tenant from available sources
   * @returns {object|null} - Resolved tenant config or null
   */
  resolve() {
    // 1. Check URL parameter (?tenant=slug)
    const urlTenant = this.#resolveFromURL()
    if (urlTenant) return urlTenant

    // 2. Check subdomain
    const subdomainTenant = this.#resolveFromSubdomain()
    if (subdomainTenant) return subdomainTenant

    // 3. Check path segment
    const pathTenant = this.#resolveFromPath()
    if (pathTenant) return pathTenant

    // 4. Check localStorage
    const storedTenant = this.#resolveFromStorage()
    if (storedTenant) return storedTenant

    // 5. Fallback to default
    return this.#registry.getDefault()
  }

  /**
   * Resolve tenant from URL parameter
   * @private
   */
  #resolveFromURL() {
    if (typeof window === 'undefined') return null

    const params = new URLSearchParams(window.location.search)
    const slug = params.get('tenant')
    if (!slug) return null

    return this.#registry.getBySlug(slug)
  }

  /**
   * Resolve tenant from subdomain
   * @private
   */
  #resolveFromSubdomain() {
    if (typeof window === 'undefined') return null

    const hostname = window.location.hostname
    const parts = hostname.split('.')

    // Check if first part is a subdomain (not www, not bare domain)
    if (parts.length > 2 && parts[0] !== 'www') {
      const subdomain = parts[0]
      return this.#registry.getBySlug(subdomain)
    }

    return null
  }

  /**
   * Resolve tenant from path segment
   * @private
   */
  #resolveFromPath() {
    if (typeof window === 'undefined') return null

    const path = window.location.pathname
    const match = path.match(/^\/tenant\/([a-z0-9-]+)/)
    if (!match) return null

    return this.#registry.getBySlug(match[1])
  }

  /**
   * Resolve tenant from localStorage
   * @private
   */
  #resolveFromStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null

    const slug = localStorage.getItem('tenant')
    if (!slug) return null

    return this.#registry.getBySlug(slug)
  }

  /**
   * Save tenant to localStorage
   * @param {string} slug - Tenant slug to remember
   */
  remember(slug) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('tenant', slug)
    }
  }

  /**
   * Clear remembered tenant
   */
  forget() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('tenant')
    }
  }
}
