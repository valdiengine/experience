export class PermissionMatrix {
  #matrix = new Map()
  #config = {}

  constructor(config = {}) {
    this.#config = {
      strictMode: config.strictMode !== false,
      ...config,
    }
  }

  define(role, permission, options = {}) {
    const key = `${role}:${permission}`
    this.#matrix.set(key, {
      role,
      permission,
      scope: options.scope || null,
      capability: options.capability || null,
      action: options.action || null,
      effect: options.effect || 'allow',
      description: options.description || '',
    })
    return this
  }

  remove(role, permission) {
    this.#matrix.delete(`${role}:${permission}`)
  }

  get(role, permission) {
    return this.#matrix.get(`${role}:${permission}`) || null
  }

  query(filter = {}) {
    let results = Array.from(this.#matrix.values())
    if (filter.role) results = results.filter(r => r.role === filter.role)
    if (filter.permission) results = results.filter(r => r.permission === filter.permission)
    if (filter.scope) results = results.filter(r => r.scope === filter.scope)
    if (filter.capability) results = results.filter(r => r.capability === filter.capability)
    if (filter.effect) results = results.filter(r => r.effect === filter.effect)
    return results
  }

  getPermissionsByRole(role) {
    return this.query({ role })
  }

  getRolesByPermission(permission) {
    return this.query({ permission })
  }

  getPermissionsByCapability(capability) {
    return this.query({ capability })
  }

  export() {
    return Array.from(this.#matrix.entries()).map(([key, entry]) => ({ key, ...entry }))
  }

  count() {
    return this.#matrix.size
  }

  health() {
    return {
      status: 'healthy',
      entries: this.#matrix.size,
      timestamp: Date.now(),
    }
  }

  supports(feature) {
    const features = ['define', 'remove', 'get', 'query', 'export', 'role-filter', 'permission-filter', 'scope-filter', 'capability-filter', 'effect-filter']
    return features.includes(feature)
  }
}

export default PermissionMatrix
