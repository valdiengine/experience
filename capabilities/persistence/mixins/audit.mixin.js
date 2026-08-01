export const AuditMixin = (Base) => class extends Base {
  #addAuditFields(data, operation) {
    const identity = this.context?.identity
    const now = new Date().toISOString()
    if (operation === 'create') {
      return { ...data, createdAt: now, createdBy: identity?.id || null, updatedAt: now, updatedBy: identity?.id || null }
    }
    if (operation === 'update') {
      return { ...data, updatedAt: now, updatedBy: identity?.id || null }
    }
    if (operation === 'delete') {
      return { ...data, deletedAt: now, deletedBy: identity?.id || null }
    }
    return data
  }
}
