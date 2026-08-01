import { RoleNotFoundError } from '../authorization/authorization.errors.js'

export class RoleRegistry {
  #roles = new Map()
  #assignments = new Map()
  #initialized = false
  #config = {}

  constructor(config = {}) {
    this.#config = {
      circularDetection: config.circularDetection !== false,
      ...config,
    }
  }

  define(roleName, definition = {}) {
    if (this.#roles.has(roleName)) return this
    const role = {
      name: roleName,
      description: definition.description || '',
      type: definition.type || 'custom',
      permissions: definition.permissions || [],
      inherits: definition.inherits || [],
      scopes: definition.scopes || [],
      tenant: definition.tenant || null,
      destination: definition.destination || null,
      priority: definition.priority || 0,
      temporary: definition.temporary || false,
      expiresAt: definition.expiresAt || null,
      metadata: definition.metadata || {},
      createdAt: Date.now(),
    }

    if (this.#config.circularDetection && role.inherits.length > 0) {
      this.#detectCircular(roleName, role.inherits)
    }

    this.#roles.set(roleName, role)
    return this
  }

  resolve(roleName) {
    return this.#roles.get(roleName) || null
  }

  remove(roleName) {
    this.#roles.delete(roleName)
  }

  isValidRole(roleName) {
    return this.#roles.has(roleName)
  }

  assign(identityId, roleName, options = {}) {
    if (!this.#roles.has(roleName)) throw new RoleNotFoundError(`Role "${roleName}" is not defined`, { roleName })
    if (!this.#assignments.has(identityId)) {
      this.#assignments.set(identityId, new Map())
    }
    const identityRoles = this.#assignments.get(identityId)
    identityRoles.set(roleName, {
      roleName,
      assignedAt: Date.now(),
      expiresAt: options.ttl ? Date.now() + (options.ttl * 1000) : null,
      assignedBy: options.assignedBy || null,
      tenant: options.tenant || null,
    })
  }

  remove(identityId, roleName) {
    const identityRoles = this.#assignments.get(identityId)
    if (identityRoles) identityRoles.delete(roleName)
  }

  list(identityId) {
    const identityRoles = this.#assignments.get(identityId)
    if (!identityRoles) return []
    return Array.from(identityRoles.values())
      .filter(r => !r.expiresAt || Date.now() < r.expiresAt)
      .map(r => r.roleName)
  }

  has(identityId, roleName) {
    const identityRoles = this.#assignments.get(identityId)
    if (!identityRoles) return false
    const entry = identityRoles.get(roleName)
    if (!entry) return false
    if (entry.expiresAt && Date.now() >= entry.expiresAt) {
      identityRoles.delete(roleName)
      return false
    }
    return true
  }

  listAll() {
    return Array.from(this.#roles.values())
  }

  listByType(type) {
    return this.listAll().filter(r => r.type === type)
  }

  roleCount() { return this.#roles.size }

  assignmentCount() {
    let total = 0
    for (const [, assignments] of this.#assignments) {
      total += assignments.size
    }
    return total
  }

  initialize() { this.#initialized = true }
  get initialized() { return this.#initialized }

  #detectCircular(roleName, inherits) {
    const visited = new Set()
    const queue = [...inherits]
    while (queue.length > 0) {
      const current = queue.shift()
      if (current === roleName) throw new RoleNotFoundError(`Circular role inheritance detected for "${roleName}"`, { roleName, chain: [...visited, current] })
      if (visited.has(current)) continue
      visited.add(current)
      const role = this.#roles.get(current)
      if (role?.inherits) queue.push(...role.inherits)
    }
  }
}

export default RoleRegistry
