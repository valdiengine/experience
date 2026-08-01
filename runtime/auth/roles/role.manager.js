import { RoleRegistry } from './role.registry.js'
import { AUTHORIZATION_EVENTS, createAuthorizationEvent } from '../authorization/authorization.events.js'

export class RoleManager {
  #registry = null
  #scopeManager = null
  #eventBus = null
  #config = {}

  constructor(scopeManager, config = {}) {
    this.#registry = new RoleRegistry(config)
    this.#scopeManager = scopeManager
    this.#config = {
      maxHierarchyDepth: config.maxHierarchyDepth || 10,
      circularDetection: config.circularDetection !== false,
      ...config,
    }
  }

  get registry() { return this.#registry }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  assign(identityId, roleName, options = {}) {
    this.#registry.assign(identityId, roleName, options)
    this.#emit(AUTHORIZATION_EVENTS.ROLE_ASSIGNED, { identityId, role: roleName, ...options })
  }

  remove(identityId, roleName) {
    this.#registry.remove(identityId, roleName)
    this.#emit(AUTHORIZATION_EVENTS.ROLE_REMOVED, { identityId, role: roleName })
  }

  resolve(roleName) {
    return this.#registry.resolve(roleName)
  }

  list(identityId) {
    return this.#registry.list(identityId)
  }

  has(identityId, roleName) {
    return this.#registry.has(identityId, roleName)
  }

  getInheritedRoles(roleName) {
    const visited = new Set()
    const inherited = []
    const queue = [roleName]

    while (queue.length > 0 && inherited.length < this.#config.maxHierarchyDepth) {
      const current = queue.shift()
      if (visited.has(current)) continue
      visited.add(current)
      const role = this.#registry.resolve(current)
      if (!role) continue
      for (const parent of (role.inherits || [])) {
        if (!visited.has(parent)) {
          inherited.push(parent)
          queue.push(parent)
        }
      }
    }

    return inherited
  }

  getInheritedPermissions(roleName) {
    const inheritedRoles = this.getInheritedRoles(roleName)
    const permissions = []
    for (const roleName of inheritedRoles) {
      const role = this.#registry.resolve(roleName)
      if (role?.permissions) {
        permissions.push(...role.permissions)
      }
    }
    return [...new Set(permissions)]
  }

  getEffectiveRoles(identityId) {
    const assigned = this.list(identityId)
    const effective = new Set(assigned)
    for (const roleName of assigned) {
      const inherited = this.getInheritedRoles(roleName)
      for (const r of inherited) effective.add(r)
    }
    return Array.from(effective)
  }

  isValidRole(roleName) {
    return this.#registry.isValidRole(roleName)
  }

  async health() {
    return {
      status: 'healthy',
      definedRoles: this.#registry.roleCount(),
      assignedRoles: this.#registry.assignmentCount(),
      timestamp: Date.now(),
    }
  }

  available() { return true }

  supports(feature) {
    const features = ['assign', 'remove', 'resolve', 'list', 'has', 'inheritance', 'hierarchy', 'circular-detection', 'effective-roles', 'inherited-permissions']
    return features.includes(feature)
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuthorizationEvent(event, data))
    }
  }
}

export default RoleManager
