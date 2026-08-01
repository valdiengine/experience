export const TenantIsolationMixin = (Base) => class extends Base {
  #applyTenantFilter(query) {
    const tenant = this.context?.tenant
    if (tenant && typeof tenant === 'string') return { ...query, tenantId: tenant }
    if (tenant && typeof tenant === 'object' && tenant.id) return { ...query, tenantId: tenant.id }
    return query
  }
  #validateTenant(entity) {
    const tenant = this.context?.tenant
    if (!tenant) return
    const tenantId = typeof tenant === 'string' ? tenant : tenant.id
    if (entity.tenantId && entity.tenantId !== tenantId) {
      throw new Error(`Tenant mismatch on ${this.constructor.entityName}`)
    }
  }
}
